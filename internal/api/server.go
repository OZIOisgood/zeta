package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/assets"
	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/coaching"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/groups"
	"github.com/OZIOisgood/zeta/internal/invitations"
	"github.com/OZIOisgood/zeta/internal/llm"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/reviews"
	"github.com/OZIOisgood/zeta/internal/users"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	Router *chi.Mux
	Pool   *pgxpool.Pool
	Logger *slog.Logger
}

func NewServer(pool *pgxpool.Pool, baseLogger *slog.Logger) *Server {
	s := &Server{
		Router: chi.NewRouter(),
		Pool:   pool,
		Logger: baseLogger,
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	// Structured logging middleware replaces middleware.Logger
	s.Router.Use(logger.Middleware(s.Logger))
	s.Router.Use(middleware.Recoverer)
	s.Router.Use(middleware.StripSlashes)

	s.Router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins(),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Timezone"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// JWKS cache — WorkOS public keys, refreshed every hour
	clientID := os.Getenv("WORKOS_CLIENT_ID")
	jwksURL := "https://api.workos.com/sso/jwks/" + clientID
	jwksCache := auth.NewJWKSCache(jwksURL, time.Hour)

	queries := db.New(s.Pool)

	// Initialize Handlers
	workosClient := auth.NewWorkOSClient()
	authHandler := auth.NewHandler(s.Logger, queries, workosClient)
	emailService := email.NewService(s.Logger)
	llmService := llm.NewService(s.Logger)
	muxClient := assets.NewMuxClient()
	assetsHandler := assets.NewHandler(queries, muxClient, emailService, workosClient, s.Logger)
	groupsHandler := groups.NewHandler(queries, s.Logger)
	invitationsHandler := invitations.NewHandler(queries, emailService, workosClient, s.Logger, frontendBaseURL())
	reviewsHandler := reviews.NewHandler(queries, s.Logger, llmService)
	usersHandler := users.NewHandler(s.Logger, queries, emailService, workosClient)
	coachingHandler := coaching.NewHandler(queries, s.Pool, emailService, workosClient, s.Logger, coaching.HandlerConfig{
		AgoraAppID:          os.Getenv("AGORA_APP_ID"),
		AgoraAppCertificate:  os.Getenv("AGORA_APP_CERTIFICATE"),
		SchedulerSecret:     os.Getenv("SCHEDULER_SECRET"),
		MinBookingNotice:    parseDurationOrDefault(os.Getenv("MIN_BOOKING_NOTICE"), 2*time.Hour),
		CancellationNotice:  parseDurationOrDefault(os.Getenv("CANCELLATION_NOTICE"), 1*time.Hour),
		ConnectWindow:       parseDurationOrDefault(os.Getenv("CONNECT_WINDOW"), 15*time.Minute),
	})

	// Global Middleware
	s.Router.Use(auth.Middleware(s.Logger, jwksCache))

	// Public Routes
	s.Router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Auth Routes
	s.Router.Group(func(r chi.Router) {
		r.Get("/auth/login", authHandler.Login)
		r.Get("/auth/callback", authHandler.Callback)
		r.Post("/auth/logout", authHandler.Logout)
		r.Get("/auth/me", authHandler.Me)
		r.Put("/auth/me", authHandler.UpdateMe)
		// Dev-only: issues a Zeta JWT via password auth — never enable in production
		if os.Getenv("DEV_AUTH_ENABLED") == "true" {
			r.Post("/auth/token", authHandler.DevToken)
		}
	})

	// Protected Routes
	s.Router.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth)
		r.Route("/assets", assetsHandler.RegisterRoutes)
		r.Route("/assets/videos", reviewsHandler.RegisterRoutes)
		r.Route("/reviews", func(r chi.Router) {
			r.Post("/enhance", reviewsHandler.EnhanceText)
		})
		r.Route("/groups", func(r chi.Router) {
			r.Get("/", groupsHandler.ListGroups)
			r.Post("/", groupsHandler.CreateGroup)
			r.Get("/{groupID}", groupsHandler.GetGroupByID)
			r.Put("/{groupID}", groupsHandler.UpdateGroupPreferences)
			r.Delete("/{groupID}", groupsHandler.DeleteGroup)
			r.Get("/{groupID}/users", usersHandler.ListGroupUsers)
			r.Delete("/{groupID}/users/{userID}", usersHandler.RemoveGroupUser)
			r.Post("/{groupID}/invitations", invitationsHandler.CreateInvitation)
			r.Get("/{groupID}/invitations/{invitationID}/qr", invitationsHandler.GetInvitationQR)
			r.Get("/invitations/{code}", invitationsHandler.GetInvitationInfo)
			r.Post("/invitations/accept", invitationsHandler.AcceptInvitation)
		})
		coachingHandler.RegisterRoutes(r)
	})

	// Internal routes (not behind user auth — protected by scheduler secret)
	s.Router.Post("/internal/coaching/reminders", coachingHandler.ProcessReminders)
}

// allowedOrigins returns CORS origins from the ALLOWED_ORIGINS env var (comma-separated)
// plus the default local development origins.
func allowedOrigins() []string {
	origins := []string{"http://localhost:4200", "http://localhost:3000"}
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			if o = strings.TrimSpace(o); o != "" {
				origins = append(origins, o)
			}
		}
	}
	return origins
}

func parseDurationOrDefault(s string, fallback time.Duration) time.Duration {
	if s == "" {
		return fallback
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}

func frontendBaseURL() string {
	if v := os.Getenv("FRONTEND_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:4200"
}
