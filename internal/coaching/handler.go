package coaching

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// Booking business-rule constants.
const (
	SlotLookaheadDays      = 28
	BlockedSlotRangeMonths = 3
	MinSessionDuration     = int32(15)
	MaxSessionDuration     = int32(120)
)

type Handler struct {
	q                   db.Querier
	pool                *pgxpool.Pool
	logger              *slog.Logger
	emailService        email.Sender
	workos              auth.UserManagement
	agoraAppID          string
	agoraAppCertificate string
	schedulerSecret     string
	minBookingNotice    time.Duration
	cancellationNotice  time.Duration
	connectWindow       time.Duration
}

// HandlerConfig holds configurable time constraints for coaching bookings.
type HandlerConfig struct {
	AgoraAppID          string
	AgoraAppCertificate string
	SchedulerSecret     string
	MinBookingNotice    time.Duration // default: 2h
	CancellationNotice  time.Duration // default: 1h
	ConnectWindow       time.Duration // default: 15m — how early before a session participants may join
}

func NewHandler(q db.Querier, pool *pgxpool.Pool, emailService email.Sender, workos auth.UserManagement, logger *slog.Logger, cfg HandlerConfig) *Handler {
	return &Handler{
		q:                   q,
		pool:                pool,
		logger:              logger,
		emailService:        emailService,
		workos:              workos,
		agoraAppID:          cfg.AgoraAppID,
		agoraAppCertificate: cfg.AgoraAppCertificate,
		schedulerSecret:     cfg.SchedulerSecret,
		minBookingNotice:    cfg.MinBookingNotice,
		cancellationNotice:  cfg.CancellationNotice,
		connectWindow:       cfg.ConnectWindow,
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
		})
	})

}

// --- User info resolution ---

type userInfo struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar,omitempty"`
}

// resolveUsers fetches user details from WorkOS for a set of user IDs concurrently.
// Returns a map of userID → userInfo. Errors are logged and the user is omitted.
func (h *Handler) resolveUsers(ctx context.Context, userIDs []string) map[string]userInfo {
	unique := make(map[string]struct{}, len(userIDs))
	for _, id := range userIDs {
		unique[id] = struct{}{}
	}

	result := make(map[string]userInfo, len(unique))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for uid := range unique {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			u, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{User: id})
			if err != nil {
				h.logger.WarnContext(ctx, "resolve_user_failed",
					slog.String("component", "coaching"),
					slog.String("user_id", id),
					slog.Any("err", err),
				)
				mu.Lock()
				result[id] = userInfo{ID: id, FirstName: id, LastName: ""}
				mu.Unlock()
				return
			}
			mu.Lock()
			result[id] = userInfo{
				ID:        u.ID,
				FirstName: u.FirstName,
				LastName:  u.LastName,
				Avatar:    u.ProfilePictureURL,
			}
			mu.Unlock()
		}(uid)
	}
	wg.Wait()
	return result
}

// resolveEmails fetches email addresses for given WorkOS user IDs.
func (h *Handler) resolveEmails(ctx context.Context, userIDs []string) []string {
	var emails []string
	for _, id := range userIDs {
		u, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{User: id})
		if err != nil {
			h.logger.WarnContext(ctx, "resolve_email_failed",
				slog.String("component", "coaching"),
				slog.String("user_id", id),
				slog.Any("err", err),
			)
			continue
		}
		if u.Email != "" {
			emails = append(emails, u.Email)
		}
	}
	return emails
}
