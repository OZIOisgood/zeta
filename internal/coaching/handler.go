package coaching

import (
	"log/slog"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Booking business-rule constants.
const (
	SlotLookaheadDays      = 28
	BlockedSlotRangeMonths = 3
	MinSessionDuration     = int32(15)
	MaxSessionDuration     = int32(120)
	SessionDurationStep    = int32(5)
)

type Handler struct {
	q                    db.Querier
	pool                 *pgxpool.Pool
	logger               *slog.Logger
	emailService         email.Sender
	workos               auth.UserManagement
	agoraAppID           string
	agoraAppCertificate  string
	recordingEnabled     bool
	recordingClient      RecordingClient
	recordingStore       RecordingObjectStore
	recordingMux         RecordingMuxClient
	recordingMode        string
	recordingEmptyGrace  time.Duration
	recordingPresenceTTL time.Duration
	recordingEndGrace    time.Duration
	appBaseURL           string
	minBookingNotice     time.Duration
	cancellationNotice   time.Duration
	connectWindow        time.Duration
}

// HandlerConfig holds configurable time constraints for coaching bookings.
type HandlerConfig struct {
	AgoraAppID           string
	AgoraAppCertificate  string
	RecordingEnabled     bool
	RecordingClient      RecordingClient
	RecordingStore       RecordingObjectStore
	RecordingMux         RecordingMuxClient
	RecordingMode        string
	RecordingEmptyGrace  time.Duration
	RecordingPresenceTTL time.Duration
	RecordingEndGrace    time.Duration
	AppBaseURL           string        // base URL of the frontend app (e.g. https://app.example.com)
	MinBookingNotice     time.Duration // default: 2h
	CancellationNotice   time.Duration // default: 1h
	ConnectWindow        time.Duration // default: 15m — how early before a session participants may join
}

func NewHandler(q db.Querier, pool *pgxpool.Pool, emailService email.Sender, workos auth.UserManagement, logger *slog.Logger, cfg HandlerConfig) *Handler {
	if cfg.RecordingMode == "" {
		cfg.RecordingMode = "mix"
	}
	if cfg.RecordingEmptyGrace <= 0 {
		cfg.RecordingEmptyGrace = 60 * time.Second
	}
	if cfg.RecordingPresenceTTL <= 0 {
		cfg.RecordingPresenceTTL = 30 * time.Second
	}
	if cfg.RecordingEndGrace <= 0 {
		cfg.RecordingEndGrace = 15 * time.Minute
	}
	return &Handler{
		q:                    q,
		pool:                 pool,
		logger:               logger,
		emailService:         emailService,
		workos:               workos,
		agoraAppID:           cfg.AgoraAppID,
		agoraAppCertificate:  cfg.AgoraAppCertificate,
		recordingEnabled:     cfg.RecordingEnabled,
		recordingClient:      cfg.RecordingClient,
		recordingStore:       cfg.RecordingStore,
		recordingMux:         cfg.RecordingMux,
		recordingMode:        cfg.RecordingMode,
		recordingEmptyGrace:  cfg.RecordingEmptyGrace,
		recordingPresenceTTL: cfg.RecordingPresenceTTL,
		recordingEndGrace:    cfg.RecordingEndGrace,
		appBaseURL:           cfg.AppBaseURL,
		minBookingNotice:     cfg.MinBookingNotice,
		cancellationNotice:   cfg.CancellationNotice,
		connectWindow:        cfg.ConnectWindow,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	// Cross-group bookings endpoint — no group membership required
	r.Group(func(r chi.Router) {
		r.Use(auth.RequirePermission(permissions.CoachingBookingsRead))
		r.Get("/coaching/bookings", h.ListAllMyBookings)
	})

	r.Route("/groups/{groupID}/coaching", func(r chi.Router) {
		r.Use(auth.RequireGroupMembership(h.q, h.logger))

		// Session types — read: slots:read | write: availability:manage
		r.Get("/session-types", h.ListSessionTypes)
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingAvailabilityManage))
			r.Post("/session-types", h.CreateSessionType)
			r.Put("/session-types/{sessionTypeID}", h.UpdateSessionType)
			r.Delete("/session-types/{sessionTypeID}", h.DeactivateSessionType)
		})

		// Availability — experts only
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingAvailabilityManage))
			r.Get("/availability", h.ListMyAvailability)
			r.Post("/availability", h.CreateAvailability)
			r.Put("/availability/{availabilityID}", h.UpdateAvailability)
			r.Delete("/availability/{availabilityID}", h.DeleteAvailability)
		})

		// Blocked slots — experts only
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingAvailabilityManage))
			r.Get("/blocked-slots", h.ListBlockedSlots)
			r.Post("/blocked-slots", h.CreateBlockedSlot)
			r.Delete("/blocked-slots/{slotID}", h.DeleteBlockedSlot)
		})

		// Slot computation + experts listing — students/readers
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingSlotsRead))
			r.Get("/slots", h.ListAvailableSlots)
			r.Get("/experts", h.ListExpertsInGroup)
		})

		// Bookings — create: coaching:book | read/manage: bookings:read
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingBook))
			r.Post("/bookings", h.CreateBooking)
		})
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingBookingsRead))
			r.Get("/bookings", h.ListMyBookings)
			r.Get("/sessions", h.ListGroupSessions)
		})
		// CancelBooking — fine-grained auth handled inside the handler
		r.Put("/bookings/{bookingID}/cancel", h.CancelBooking)

		// Video connect — generate Agora RTC token
		r.Group(func(r chi.Router) {
			r.Use(auth.RequirePermission(permissions.CoachingVideoConnect))
			r.Get("/bookings/{bookingID}/connect", h.ConnectToBooking)
			r.Post("/bookings/{bookingID}/presence", h.UpdateBookingPresence)
			r.Post("/bookings/{bookingID}/recording/stop", h.StopBookingRecording)
		})
	})

}
