package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/OZIOisgood/zeta/internal/assets"
	"github.com/OZIOisgood/zeta/internal/auth"
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
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	queries := db.New(s.Pool)

	// Initialize Handlers
	authHandler := auth.NewHandler(s.Logger, queries)
	emailService := email.NewService(s.Logger)
	llmService := llm.NewService(s.Logger)
	assetsHandler := assets.NewHandler(queries, emailService, s.Logger)
	groupsHandler := groups.NewHandler(queries, s.Logger)
	invitationsHandler := invitations.NewHandler(queries, emailService, s.Logger)
	reviewsHandler := reviews.NewHandler(queries, s.Logger, llmService)
	usersHandler := users.NewHandler(s.Logger, queries, emailService)

	// Global Middleware
	s.Router.Use(auth.Middleware(s.Logger))

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
			r.Get("/{groupID}/users", usersHandler.ListGroupUsers)
			r.Delete("/{groupID}/users/{userID}", usersHandler.RemoveGroupUser)
			r.Post("/{groupID}/invitations", invitationsHandler.CreateInvitation)
			r.Get("/invitations/{code}", invitationsHandler.GetInvitationInfo)
			r.Post("/invitations/accept", invitationsHandler.AcceptInvitation)
		})
	})
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
