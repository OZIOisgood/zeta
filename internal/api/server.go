package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/access"
	"github.com/OZIOisgood/zeta/internal/assets"
	"github.com/OZIOisgood/zeta/internal/audit"
	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/coaching"
	"github.com/OZIOisgood/zeta/internal/contact"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/feedback"
	"github.com/OZIOisgood/zeta/internal/groups"
	"github.com/OZIOisgood/zeta/internal/inboundemail"
	"github.com/OZIOisgood/zeta/internal/invitations"
	"github.com/OZIOisgood/zeta/internal/llm"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/moderation"
	"github.com/OZIOisgood/zeta/internal/notifications"
	"github.com/OZIOisgood/zeta/internal/reports"
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
	cancel context.CancelFunc
}

func NewServer(pool *pgxpool.Pool, baseLogger *slog.Logger) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Server{
		Router: chi.NewRouter(),
		Pool:   pool,
		Logger: baseLogger,
		cancel: cancel,
	}
	s.routes(ctx)
	return s
}

// Shutdown cancels the server's internal context, stopping background goroutines
// (e.g. the Postgres LISTEN/NOTIFY listener) so DB connections are released cleanly.
func (s *Server) Shutdown() {
	s.cancel()
}

func (s *Server) routes(ctx context.Context) {
	// Structured logging middleware replaces middleware.Logger
	s.Router.Use(logger.Middleware(s.Logger, os.Getenv("GCP_PROJECT_ID")))
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

	auditRetention := time.Duration(parseIntOrDefault(os.Getenv("AUDIT_RETENTION_DAYS"), audit.DefaultRetentionDays)) * 24 * time.Hour
	auditHandler := audit.NewHandler(s.Pool, s.Logger, auditRetention)

	// Initialize Handlers
	workosClient := auth.NewWorkOSClient()
	authHandler := auth.NewHandler(s.Logger, queries, workosClient)
	accessHandler := access.NewHandler(queries, workosClient, authHandler, s.Logger)
	emailService := email.NewService(s.Logger)
	llmService := llm.NewService(s.Logger)
	muxClient := assets.NewMuxClient()
	assetsHandler := assets.NewHandler(queries, muxClient, emailService, workosClient, s.Logger)
	groupsHandler := groups.NewHandler(queries, s.Logger)
	invitationsHandler := invitations.NewHandler(queries, emailService, workosClient, s.Logger, frontendBaseURL())
	reviewsHandler := reviews.NewHandler(queries, s.Logger, llmService)
	usersHandler := users.NewHandler(s.Logger, queries, emailService, workosClient)
	reportsHandler := reports.NewHandler(queries, s.Logger)
	var discordPoster discord.Poster
	if discordToken := os.Getenv("DISCORD_BOT_TOKEN"); strings.TrimSpace(discordToken) != "" {
		discordPoster = discord.NewClient(discordToken)
	}
	contactHandler := contact.NewHandler(
		queries,
		contact.NewResendSender(
			os.Getenv("RESEND_API_KEY"),
			os.Getenv("RESEND_FROM_EMAIL"),
			os.Getenv("INBOUND_EMAIL_SUPPORT_ADDRESS"),
		),
		s.Logger,
	)
	feedbackHandler := feedback.NewHandler(
		queries,
		discordPoster,
		s.Logger,
		feedback.HandlerConfig{DiscordChannelID: os.Getenv("DISCORD_FEEDBACK_FORUM_CHANNEL_ID")},
	)
	moderationHandler := moderation.NewHandler(
		queries,
		discordPoster,
		s.Logger,
		moderation.HandlerConfig{DiscordChannelID: os.Getenv("DISCORD_MODERATION_REPORTS_FORUM_CHANNEL_ID")},
	)
	inboundEmailHandler := inboundemail.NewHandler(
		queries,
		inboundemail.NewResendProvider(os.Getenv("RESEND_API_KEY")),
		discordPoster,
		s.Logger,
		inboundemail.Config{
			WebhookSigningSecret: os.Getenv("RESEND_WEBHOOK_SIGNING_SECRET"),
			ForwardFrom:          os.Getenv("RESEND_FROM_EMAIL"),
			CopyRecipients:       splitCSV(os.Getenv("INBOUND_EMAIL_COPY_RECIPIENTS")),
			Routes: []inboundemail.Route{
				{
					Inbox:            "social",
					Address:          os.Getenv("INBOUND_EMAIL_SOCIAL_ADDRESS"),
					DiscordChannelID: os.Getenv("DISCORD_SOCIAL_INBOX_FORUM_CHANNEL_ID"),
				},
				{
					Inbox:            "support",
					Address:          os.Getenv("INBOUND_EMAIL_SUPPORT_ADDRESS"),
					DiscordChannelID: os.Getenv("DISCORD_SUPPORT_INBOX_FORUM_CHANNEL_ID"),
				},
				{
					Inbox:            "dsa",
					Address:          os.Getenv("INBOUND_EMAIL_DSA_ADDRESS"),
					DiscordChannelID: os.Getenv("DISCORD_DSA_INBOX_FORUM_CHANNEL_ID"),
				},
			},
		},
	)

	// In-app notifications: a per-instance hub fed by a Postgres LISTEN/NOTIFY
	// listener (started below) delivers events to connected SSE clients.
	notificationsHub := notifications.NewHub()
	notificationsHandler := notifications.NewHandler(queries, notificationsHub, s.Logger)
	go notifications.NewListener(s.Pool, queries, notificationsHub, s.Logger).Run(ctx)
	recordingEnabled := parseBool(os.Getenv("AGORA_CLOUD_RECORDING_ENABLED"))
	var recordingClient coaching.RecordingClient
	var recordingStore coaching.RecordingObjectStore
	if recordingEnabled {
		recordingClient = coaching.NewAgoraCloudRecordingClient(s.Logger, coaching.AgoraCloudRecordingConfig{
			AppID:              os.Getenv("AGORA_APP_ID"),
			CustomerID:         os.Getenv("AGORA_REST_CUSTOMER_ID"),
			CustomerSecret:     os.Getenv("AGORA_REST_CUSTOMER_SECRET"),
			BaseURL:            os.Getenv("AGORA_CLOUD_RECORDING_BASE_URL"),
			Mode:               envOrDefault(os.Getenv("AGORA_RECORDING_MODE"), "mix"),
			StorageVendor:      parseIntOrDefault(os.Getenv("AGORA_RECORDING_STORAGE_VENDOR"), 1),
			StorageRegion:      parseIntOrDefault(os.Getenv("AGORA_RECORDING_STORAGE_REGION"), 0),
			StorageBucket:      os.Getenv("AGORA_RECORDING_STORAGE_BUCKET"),
			StorageAccessKey:   os.Getenv("AGORA_RECORDING_STORAGE_ACCESS_KEY"),
			StorageSecretKey:   os.Getenv("AGORA_RECORDING_STORAGE_SECRET_KEY"),
			FileNamePrefix:     splitCSV(os.Getenv("AGORA_RECORDING_FILE_PREFIX")),
			MaxIdleTime:        parseIntOrDefault(os.Getenv("AGORA_RECORDING_MAX_IDLE_TIME"), 30),
			TranscodingWidth:   parseIntOrDefault(os.Getenv("AGORA_RECORDING_TRANSCODING_WIDTH"), 640),
			TranscodingHeight:  parseIntOrDefault(os.Getenv("AGORA_RECORDING_TRANSCODING_HEIGHT"), 360),
			TranscodingBitrate: parseIntOrDefault(os.Getenv("AGORA_RECORDING_TRANSCODING_BITRATE"), 1500),
			TranscodingFPS:     parseIntOrDefault(os.Getenv("AGORA_RECORDING_TRANSCODING_FPS"), 30),
		})
		if bucket := os.Getenv("AGORA_RECORDING_STORAGE_BUCKET"); bucket != "" {
			store, err := coaching.NewGCSRecordingObjectStore(
				context.Background(),
				bucket,
				os.Getenv("GCS_SIGNING_SERVICE_ACCOUNT"),
			)
			if err != nil {
				s.Logger.Error("recording_store_init_failed", slog.Any("err", err))
			} else {
				recordingStore = store
			}
		}
	}
	coachingHandler := coaching.NewHandler(queries, s.Pool, emailService, workosClient, s.Logger, coaching.HandlerConfig{
		AgoraAppID:           os.Getenv("AGORA_APP_ID"),
		AgoraAppCertificate:  os.Getenv("AGORA_APP_CERTIFICATE"),
		RecordingEnabled:     recordingEnabled,
		RecordingClient:      recordingClient,
		RecordingStore:       recordingStore,
		RecordingMux:         muxClient,
		RecordingMode:        envOrDefault(os.Getenv("AGORA_RECORDING_MODE"), "mix"),
		RecordingEmptyGrace:  parseDurationOrDefault(os.Getenv("AGORA_RECORDING_EMPTY_GRACE"), 60*time.Second),
		RecordingPresenceTTL: parseDurationOrDefault(os.Getenv("AGORA_RECORDING_PRESENCE_TTL"), 30*time.Second),
		RecordingEndGrace:    parseDurationOrDefault(os.Getenv("AGORA_RECORDING_END_GRACE"), 15*time.Minute),
		AppBaseURL:           frontendBaseURL(),
		MinBookingNotice:     parseDurationOrDefault(os.Getenv("MIN_BOOKING_NOTICE"), 2*time.Hour),
		CancellationNotice:   parseDurationOrDefault(os.Getenv("CANCELLATION_NOTICE"), 1*time.Hour),
		ConnectWindow:        parseDurationOrDefault(os.Getenv("CONNECT_WINDOW"), 15*time.Minute),
	})

	// Global Middleware
	s.Router.Use(auth.Middleware(s.Logger, jwksCache))
	s.Router.Use(audit.Middleware(parseBool(os.Getenv("AUDIT_CAPTURE_IP"))))

	// Public Routes
	s.Router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	s.Router.Post("/webhooks/resend", inboundEmailHandler.Webhook)
	s.Router.Post("/public/coaching/recording-renderer/exchange", coachingHandler.ExchangeRecordingRendererCapability)
	s.Router.Route("/contact", contactHandler.RegisterRoutes)

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

		// Reachable while waitlisted: redeem an invite code to activate.
		r.Post("/access/redeem", accessHandler.Redeem)
		r.Get("/access/group-invitations/{code}", accessHandler.PreviewGroupInvitation)

		// Everything else requires an activated account.
		r.Group(func(r chi.Router) {
			r.Use(accessHandler.RequireActiveAccess)

			r.Get("/access/codes", accessHandler.ListCodes)

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
				r.Delete("/{groupID}/membership", groupsHandler.LeaveGroup)
				r.Get("/{groupID}/users", usersHandler.ListGroupUsers)
				r.Get("/{groupID}/experts", usersHandler.ListGroupExperts)
				r.Delete("/{groupID}/users/{userID}", usersHandler.RemoveGroupUser)
				r.Post("/{groupID}/invitations", invitationsHandler.CreateInvitation)
				r.Get("/{groupID}/invitations", invitationsHandler.ListInvitations)
				r.Delete("/{groupID}/invitations/{invitationID}", invitationsHandler.RevokeInvitation)
				r.Get("/{groupID}/invitations/{invitationID}/qr", invitationsHandler.GetInvitationQR)
				r.Get("/invitations/{code}", invitationsHandler.GetInvitationInfo)
				r.Post("/invitations/accept", invitationsHandler.AcceptInvitation)
				r.Post("/invitations/decline", invitationsHandler.DeclineInvitation)
			})
			r.Route("/notifications", notificationsHandler.RegisterRoutes)
			r.Route("/feedback", feedbackHandler.RegisterRoutes)
			r.Route("/moderation", moderationHandler.RegisterRoutes)
			reportsHandler.RegisterRoutes(r)
			coachingHandler.RegisterRoutes(r)
		})
	})

	// Internal routes (not behind user auth — protected by the scheduler secret)
	s.Router.Group(func(r chi.Router) {
		r.Use(auth.RequireSchedulerSecret(os.Getenv("SCHEDULER_SECRET"), s.Logger))
		r.Post("/internal/coaching/reminders", coachingHandler.ProcessReminders)
		r.Post("/internal/coaching/recordings/cleanup", coachingHandler.CleanupFinishedRecordings)
		r.Post("/internal/coaching/recordings/process", coachingHandler.ProcessRecordingImports)
		r.Post("/internal/assets/durations/backfill", assetsHandler.BackfillVideoDurations)
		r.Post("/internal/audit/maintenance", auditHandler.RunMaintenance)
		r.Post("/internal/inbound-email/reconcile", inboundEmailHandler.Reconcile)
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
	if landingOrigin := strings.TrimSpace(os.Getenv("LANDING_ORIGIN")); landingOrigin != "" {
		origins = append(origins, strings.TrimRight(landingOrigin, "/"))
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

func parseBool(s string) bool {
	v, err := strconv.ParseBool(s)
	return err == nil && v
}

func parseIntOrDefault(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return v
}

func envOrDefault(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			values = append(values, value)
		}
	}
	return values
}

func frontendBaseURL() string {
	if v := os.Getenv("FRONTEND_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:4200"
}
