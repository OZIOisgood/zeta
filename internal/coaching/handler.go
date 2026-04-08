package coaching

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// Booking business-rule constants.
const (
	MinBookingNotice      = 2 * time.Hour
	CancellationNotice    = 1 * time.Hour
	SlotLookaheadDays     = 28
	BlockedSlotRangeMonths = 3
	MinSessionDuration    = int32(15)
	MaxSessionDuration    = int32(120)
)

type Handler struct {
	q            *db.Queries
	pool         *pgxpool.Pool
	logger       *slog.Logger
	emailService *email.Service
}

func NewHandler(q *db.Queries, pool *pgxpool.Pool, emailService *email.Service, logger *slog.Logger) *Handler {
	return &Handler{
		q:            q,
		pool:         pool,
		logger:       logger,
		emailService: emailService,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	// Per-group endpoints — guarded by group membership
	r.Route("/groups/{groupID}/coaching", func(r chi.Router) {
		r.Use(auth.RequireGroupMembership(h.q, h.logger))

		r.Get("/sessions", h.ListGroupSessions)
		r.Get("/experts", h.ListExpertsInGroup)

		// Session types (experts)
		r.Get("/session-types", h.ListSessionTypes)
		r.Post("/session-types", h.CreateSessionType)
		r.Put("/session-types/{sessionTypeID}", h.UpdateSessionType)
		r.Delete("/session-types/{sessionTypeID}", h.DeactivateSessionType)

		// Availability management (experts)
		r.Get("/availability", h.ListMyAvailability)
		r.Post("/availability", h.CreateAvailability)
		r.Put("/availability/{availabilityID}", h.UpdateAvailability)
		r.Delete("/availability/{availabilityID}", h.DeleteAvailability)

		// Blocked slots (experts)
		r.Get("/blocked-slots", h.ListBlockedSlots)
		r.Post("/blocked-slots", h.CreateBlockedSlot)
		r.Delete("/blocked-slots/{slotID}", h.DeleteBlockedSlot)

		// Slot computation (students/all roles)
		r.Get("/slots", h.ListAvailableSlots)

		// Bookings
		r.Post("/bookings", h.CreateBooking)
		r.Get("/bookings", h.ListMyBookings)
		r.Put("/bookings/{bookingID}/status", h.UpdateBookingStatus)
	})

	// Cross-group endpoints
	r.Get("/coaching/timezone", h.GetMyTimezone)
	r.Put("/coaching/timezone", h.SetMyTimezone)
}

// --- User info resolution ---

type userInfo struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar,omitempty"`
}

// resolveUsers fetches user details from WorkOS for a set of user IDs.
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
			u, err := usermanagement.GetUser(ctx, usermanagement.GetUserOpts{User: id})
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

// --- Timezone ---

func (h *Handler) GetMyTimezone(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tz, err := h.q.GetUserTimezone(ctx, user.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			tz = "UTC"
		} else {
			http.Error(w, "Failed to get timezone", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"timezone": tz})
}

type setTimezoneRequest struct {
	Timezone string `json:"timezone"`
}

func (h *Handler) SetMyTimezone(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req setTimezoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if _, err := time.LoadLocation(req.Timezone); err != nil {
		http.Error(w, "Invalid timezone", http.StatusBadRequest)
		return
	}

	if err := h.q.UpsertUserTimezone(ctx, db.UpsertUserTimezoneParams{
		UserID:   user.ID,
		Timezone: req.Timezone,
	}); err != nil {
		http.Error(w, "Failed to save timezone", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"timezone": req.Timezone})
}

// --- Session Types ---

type sessionTypeResponse struct {
	ID              string    `json:"id"`
	ExpertID        string    `json:"expert_id"`
	GroupID         string    `json:"group_id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	DurationMinutes int32     `json:"duration_minutes"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}

func toSessionTypeResponse(st db.CoachingSessionType) sessionTypeResponse {
	return sessionTypeResponse{
		ID:              uuidToString(st.ID),
		ExpertID:        st.ExpertID,
		GroupID:         uuidToString(st.GroupID),
		Name:            st.Name,
		Description:     st.Description,
		DurationMinutes: st.DurationMinutes,
		IsActive:        st.IsActive,
		CreatedAt:       st.CreatedAt.Time,
	}
}

// ListSessionTypes lists session types.
// Experts see only their own; others see all active types in the group.
func (h *Handler) ListSessionTypes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var types []db.CoachingSessionType

	if permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		// Expert: list own session types
		types, err = h.q.ListSessionTypesByExpertGroup(ctx, db.ListSessionTypesByExpertGroupParams{
			ExpertID: user.ID,
			GroupID:  groupID,
		})
	} else if permissions.HasPermission(user.Permissions, permissions.CoachingSlotsRead) {
		// Student or viewer: list all active session types in group
		types, err = h.q.ListSessionTypesByGroup(ctx, groupID)
	} else {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	if err != nil {
		log.ErrorContext(ctx, "list_session_types_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list session types", http.StatusInternalServerError)
		return
	}

	if types == nil {
		types = []db.CoachingSessionType{}
	}

	resp := make([]sessionTypeResponse, len(types))
	for i, st := range types {
		resp[i] = toSessionTypeResponse(st)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type createSessionTypeRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	DurationMinutes int32  `json:"duration_minutes"`
}

func (h *Handler) CreateSessionType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req createSessionTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	if req.DurationMinutes < MinSessionDuration || req.DurationMinutes > MaxSessionDuration {
		http.Error(w, "duration_minutes must be between 15 and 120", http.StatusBadRequest)
		return
	}

	st, err := h.q.CreateSessionType(ctx, db.CreateSessionTypeParams{
		ExpertID:        user.ID,
		GroupID:         groupID,
		Name:            req.Name,
		Description:     req.Description,
		DurationMinutes: req.DurationMinutes,
	})
	if err != nil {
		log.ErrorContext(ctx, "create_session_type_failed",
			slog.String("component", "coaching"),
			slog.String("expert_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create session type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toSessionTypeResponse(st))
}

type updateSessionTypeRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	DurationMinutes int32  `json:"duration_minutes"`
}

func (h *Handler) UpdateSessionType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	sessionTypeID, err := parseUUID(chi.URLParam(r, "sessionTypeID"))
	if err != nil {
		http.Error(w, "Invalid session type ID", http.StatusBadRequest)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req updateSessionTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	if req.DurationMinutes < MinSessionDuration || req.DurationMinutes > MaxSessionDuration {
		http.Error(w, "duration_minutes must be between 15 and 120", http.StatusBadRequest)
		return
	}

	st, err := h.q.UpdateSessionType(ctx, db.UpdateSessionTypeParams{
		ID:              sessionTypeID,
		Name:            req.Name,
		Description:     req.Description,
		DurationMinutes: req.DurationMinutes,
		ExpertID:        user.ID,
		GroupID:         groupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Session type not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "update_session_type_failed",
			slog.String("component", "coaching"),
			slog.String("session_type_id", chi.URLParam(r, "sessionTypeID")),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update session type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toSessionTypeResponse(st))
}

func (h *Handler) DeactivateSessionType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	sessionTypeID, err := parseUUID(chi.URLParam(r, "sessionTypeID"))
	if err != nil {
		http.Error(w, "Invalid session type ID", http.StatusBadRequest)
		return
	}

	n, err := h.q.DeactivateSessionType(ctx, db.DeactivateSessionTypeParams{
		ID:       sessionTypeID,
		ExpertID: user.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "deactivate_session_type_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to deactivate session type", http.StatusInternalServerError)
		return
	}
	if n == 0 {
		http.Error(w, "Session type not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Availability ---

type availabilityResponse struct {
	ID        string    `json:"id"`
	ExpertID  string    `json:"expert_id"`
	GroupID   string    `json:"group_id"`
	DayOfWeek int16     `json:"day_of_week"`
	StartTime string    `json:"start_time"`
	EndTime   string    `json:"end_time"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

func toAvailabilityResponse(a db.CoachingAvailability) availabilityResponse {
	return availabilityResponse{
		ID:        uuidToString(a.ID),
		ExpertID:  a.ExpertID,
		GroupID:   uuidToString(a.GroupID),
		DayOfWeek: a.DayOfWeek,
		StartTime: pgTimeToString(a.StartTime),
		EndTime:   pgTimeToString(a.EndTime),
		IsActive:  a.IsActive,
		CreatedAt: a.CreatedAt.Time,
	}
}

func (h *Handler) ListMyAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	avail, err := h.q.ListAvailabilityByExpertGroup(ctx, db.ListAvailabilityByExpertGroupParams{
		ExpertID: user.ID,
		GroupID:  groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_availability_failed",
			slog.String("component", "coaching"),
			slog.String("expert_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list availability", http.StatusInternalServerError)
		return
	}

	resp := make([]availabilityResponse, len(avail))
	for i, a := range avail {
		resp[i] = toAvailabilityResponse(a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type CreateAvailabilityRequest struct {
	DayOfWeek int16  `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

func (h *Handler) CreateAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req CreateAvailabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DayOfWeek < 0 || req.DayOfWeek > 6 {
		http.Error(w, "day_of_week must be 0–6", http.StatusBadRequest)
		return
	}

	startTime, err := parseTime(req.StartTime)
	if err != nil {
		http.Error(w, "Invalid start_time format (use HH:MM)", http.StatusBadRequest)
		return
	}
	endTime, err := parseTime(req.EndTime)
	if err != nil {
		http.Error(w, "Invalid end_time format (use HH:MM)", http.StatusBadRequest)
		return
	}
	if startTime.Microseconds >= endTime.Microseconds {
		http.Error(w, "start_time must be before end_time", http.StatusBadRequest)
		return
	}

	avail, err := h.q.CreateAvailability(ctx, db.CreateAvailabilityParams{
		ExpertID:  user.ID,
		GroupID:   groupID,
		DayOfWeek: req.DayOfWeek,
		StartTime: startTime,
		EndTime:   endTime,
	})
	if err != nil {
		log.ErrorContext(ctx, "create_availability_failed",
			slog.String("component", "coaching"),
			slog.String("expert_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create availability", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toAvailabilityResponse(avail))
}

func (h *Handler) UpdateAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	availabilityID, err := parseUUID(chi.URLParam(r, "availabilityID"))
	if err != nil {
		http.Error(w, "Invalid availability ID", http.StatusBadRequest)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req CreateAvailabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	startTime, err := parseTime(req.StartTime)
	if err != nil {
		http.Error(w, "Invalid start_time format (use HH:MM)", http.StatusBadRequest)
		return
	}
	endTime, err := parseTime(req.EndTime)
	if err != nil {
		http.Error(w, "Invalid end_time format (use HH:MM)", http.StatusBadRequest)
		return
	}
	if startTime.Microseconds >= endTime.Microseconds {
		http.Error(w, "start_time must be before end_time", http.StatusBadRequest)
		return
	}

	avail, err := h.q.UpdateAvailability(ctx, db.UpdateAvailabilityParams{
		ID:        availabilityID,
		DayOfWeek: req.DayOfWeek,
		StartTime: startTime,
		EndTime:   endTime,
		ExpertID:  user.ID,
		GroupID:   groupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Availability not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "update_availability_failed",
			slog.String("component", "coaching"),
			slog.String("availability_id", chi.URLParam(r, "availabilityID")),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update availability", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toAvailabilityResponse(avail))
}

func (h *Handler) DeleteAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	availabilityID, err := parseUUID(chi.URLParam(r, "availabilityID"))
	if err != nil {
		http.Error(w, "Invalid availability ID", http.StatusBadRequest)
		return
	}

	n, err := h.q.DeleteAvailability(ctx, db.DeleteAvailabilityParams{
		ID:       availabilityID,
		ExpertID: user.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "delete_availability_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to delete availability", http.StatusInternalServerError)
		return
	}
	if n == 0 {
		http.Error(w, "Availability not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Blocked Slots ---

type blockedSlotResponse struct {
	ID          string    `json:"id"`
	ExpertID    string    `json:"expert_id"`
	BlockedDate string    `json:"blocked_date"`
	StartTime   *string   `json:"start_time,omitempty"`
	EndTime     *string   `json:"end_time,omitempty"`
	Reason      *string   `json:"reason,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func toBlockedSlotResponse(b db.CoachingBlockedSlot) blockedSlotResponse {
	resp := blockedSlotResponse{
		ID:          uuidToString(b.ID),
		ExpertID:    b.ExpertID,
		BlockedDate: b.BlockedDate.Time.Format("2006-01-02"),
		CreatedAt:   b.CreatedAt.Time,
	}
	if b.StartTime.Valid {
		s := pgTimeToString(b.StartTime)
		resp.StartTime = &s
	}
	if b.EndTime.Valid {
		e := pgTimeToString(b.EndTime)
		resp.EndTime = &e
	}
	if b.Reason.Valid {
		resp.Reason = &b.Reason.String
	}
	return resp
}

func (h *Handler) ListBlockedSlots(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	now := time.Now()
	fromDate := pgtype.Date{}
	_ = fromDate.Scan(now.Format("2006-01-02"))
	toDate := pgtype.Date{}
	_ = toDate.Scan(now.AddDate(0, 3, 0).Format("2006-01-02"))

	slots, err := h.q.ListBlockedSlots(ctx, db.ListBlockedSlotsParams{
		ExpertID: user.ID,
		FromDate: fromDate,
		ToDate:   toDate,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_blocked_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list blocked slots", http.StatusInternalServerError)
		return
	}

	resp := make([]blockedSlotResponse, len(slots))
	for i, s := range slots {
		resp[i] = toBlockedSlotResponse(s)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type CreateBlockedSlotRequest struct {
	BlockedDate string  `json:"blocked_date"`
	StartTime   *string `json:"start_time,omitempty"`
	EndTime     *string `json:"end_time,omitempty"`
	Reason      *string `json:"reason,omitempty"`
}

func (h *Handler) CreateBlockedSlot(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req CreateBlockedSlotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var blockedDate pgtype.Date
	if err := blockedDate.Scan(req.BlockedDate); err != nil {
		http.Error(w, "Invalid blocked_date (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	var startTime pgtype.Time
	if req.StartTime != nil {
		t, err := parseTime(*req.StartTime)
		if err != nil {
			http.Error(w, "Invalid start_time", http.StatusBadRequest)
			return
		}
		startTime = t
	}

	var endTime pgtype.Time
	if req.EndTime != nil {
		t, err := parseTime(*req.EndTime)
		if err != nil {
			http.Error(w, "Invalid end_time", http.StatusBadRequest)
			return
		}
		endTime = t
	}

	// start_time and end_time must be either both provided or both absent
	if startTime.Valid != endTime.Valid {
		http.Error(w, "start_time and end_time must both be provided or both omitted", http.StatusBadRequest)
		return
	}
	if startTime.Valid && startTime.Microseconds >= endTime.Microseconds {
		http.Error(w, "start_time must be before end_time", http.StatusBadRequest)
		return
	}

	var reason pgtype.Text
	if req.Reason != nil {
		reason = pgtype.Text{String: *req.Reason, Valid: true}
	}

	slot, err := h.q.CreateBlockedSlot(ctx, db.CreateBlockedSlotParams{
		ExpertID:    user.ID,
		BlockedDate: blockedDate,
		StartTime:   startTime,
		EndTime:     endTime,
		Reason:      reason,
	})
	if err != nil {
		log.ErrorContext(ctx, "create_blocked_slot_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create blocked slot", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toBlockedSlotResponse(slot))
}

func (h *Handler) DeleteBlockedSlot(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	slotID, err := parseUUID(chi.URLParam(r, "slotID"))
	if err != nil {
		http.Error(w, "Invalid slot ID", http.StatusBadRequest)
		return
	}

	n, err := h.q.DeleteBlockedSlot(ctx, db.DeleteBlockedSlotParams{
		ID:       slotID,
		ExpertID: user.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "delete_blocked_slot_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to delete blocked slot", http.StatusInternalServerError)
		return
	}
	if n == 0 {
		http.Error(w, "Blocked slot not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Experts ---

type ExpertInfo struct {
	ExpertID  string `json:"expert_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar,omitempty"`
}

func (h *Handler) ListExpertsInGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingSlotsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	expertIDs, err := h.q.ListActiveExpertsInGroup(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "list_experts_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list experts", http.StatusInternalServerError)
		return
	}

	if expertIDs == nil {
		expertIDs = []string{}
	}

	users := h.resolveUsers(ctx, expertIDs)

	resp := make([]ExpertInfo, len(expertIDs))
	for i, id := range expertIDs {
		u := users[id]
		resp[i] = ExpertInfo{
			ExpertID:  id,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Avatar:    u.Avatar,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// --- Slot Computation ---

type SlotResponse struct {
	ExpertID string    `json:"expert_id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Duration int32     `json:"duration_minutes"`
}

func (h *Handler) ListAvailableSlots(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingSlotsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	expertID := r.URL.Query().Get("expert_id")
	if expertID == "" {
		http.Error(w, "expert_id query param required", http.StatusBadRequest)
		return
	}

	sessionTypeIDStr := r.URL.Query().Get("session_type_id")
	if sessionTypeIDStr == "" {
		http.Error(w, "session_type_id query param required", http.StatusBadRequest)
		return
	}
	sessionTypeID, err := parseUUID(sessionTypeIDStr)
	if err != nil {
		http.Error(w, "Invalid session_type_id", http.StatusBadRequest)
		return
	}

	// Load session type to get duration
	sessionType, err := h.q.GetSessionType(ctx, db.GetSessionTypeParams{
		ID:      sessionTypeID,
		GroupID: groupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Session type not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "get_session_type_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to get session type", http.StatusInternalServerError)
		return
	}

	// Compute slots for the next 4 weeks
	now := time.Now().UTC()
	rangeStart := now
	rangeEnd := now.AddDate(0, 0, 28)

	// 1. Get expert's timezone
	tz, err := h.q.GetUserTimezone(ctx, expertID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			tz = "UTC"
		} else {
			log.ErrorContext(ctx, "get_timezone_failed",
				slog.String("component", "coaching"),
				slog.String("expert_id", expertID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to get expert timezone", http.StatusInternalServerError)
			return
		}
	}

	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}

	// 2. Fetch active availability
	avail, err := h.q.ListAvailabilityByExpertGroup(ctx, db.ListAvailabilityByExpertGroupParams{
		ExpertID: expertID,
		GroupID:  groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_availability_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list availability", http.StatusInternalServerError)
		return
	}

	// 3. Fetch blocked slots
	var fromDate, toDate pgtype.Date
	_ = fromDate.Scan(rangeStart.Format("2006-01-02"))
	_ = toDate.Scan(rangeEnd.Format("2006-01-02"))
	blocked, err := h.q.ListBlockedSlots(ctx, db.ListBlockedSlotsParams{
		ExpertID: expertID,
		FromDate: fromDate,
		ToDate:   toDate,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_blocked_slots_for_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list blocked slots", http.StatusInternalServerError)
		return
	}

	// 4. Fetch existing bookings in range
	var pgRangeStart, pgRangeEnd pgtype.Timestamptz
	_ = pgRangeStart.Scan(rangeStart)
	_ = pgRangeEnd.Scan(rangeEnd)
	bookings, err := h.q.ListBookingsByExpertInRange(ctx, db.ListBookingsByExpertInRangeParams{
		ExpertID:      expertID,
		ScheduledAt:   pgRangeStart,
		ScheduledAt_2: pgRangeEnd,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_bookings_for_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list bookings", http.StatusInternalServerError)
		return
	}

	// 5. Compute slots using the session type's duration
	minNotice := now.Add(MinBookingNotice)
	slots := computeSlots(avail, blocked, bookings, loc, rangeStart, rangeEnd, minNotice, sessionType.DurationMinutes)
	if slots == nil {
		slots = []SlotResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slots)
}

// computeSlots generates available slot windows for an expert given a specific session duration.
func computeSlots(
	avail []db.CoachingAvailability,
	blocked []db.CoachingBlockedSlot,
	bookings []db.CoachingBooking,
	loc *time.Location,
	rangeStart, rangeEnd, minNotice time.Time,
	durationMinutes int32,
) []SlotResponse {
	duration := time.Duration(durationMinutes) * time.Minute

	// Index availability by day_of_week
	byDay := make(map[int16][]db.CoachingAvailability)
	for _, a := range avail {
		byDay[a.DayOfWeek] = append(byDay[a.DayOfWeek], a)
	}

	// Index blocked slots by date string
	blockedByDate := make(map[string][]db.CoachingBlockedSlot)
	for _, b := range blocked {
		key := b.BlockedDate.Time.Format("2006-01-02")
		blockedByDate[key] = append(blockedByDate[key], b)
	}

	var slots []SlotResponse
	for d := rangeStart; d.Before(rangeEnd); d = d.AddDate(0, 0, 1) {
		// day_of_week: 0=Sun, 1=Mon, ... 6=Sat
		dow := int16(d.Weekday())
		dayAvail, ok := byDay[dow]
		if !ok {
			continue
		}

		dateKey := d.Format("2006-01-02")
		blockedToday := blockedByDate[dateKey]

		for _, a := range dayAvail {
			// Build slot start/end in expert's timezone for this date
			startH := int(a.StartTime.Microseconds / int64(time.Hour/time.Microsecond))
			startM := int((a.StartTime.Microseconds % int64(time.Hour/time.Microsecond)) / int64(time.Minute/time.Microsecond))
			endH := int(a.EndTime.Microseconds / int64(time.Hour/time.Microsecond))
			endM := int((a.EndTime.Microseconds % int64(time.Hour/time.Microsecond)) / int64(time.Minute/time.Microsecond))

			windowStart := time.Date(d.Year(), d.Month(), d.Day(), startH, startM, 0, 0, loc).UTC()
			windowEnd := time.Date(d.Year(), d.Month(), d.Day(), endH, endM, 0, 0, loc).UTC()

			for slotStart := windowStart; slotStart.Add(duration).Before(windowEnd) || slotStart.Add(duration).Equal(windowEnd); slotStart = slotStart.Add(duration) {
				slotEnd := slotStart.Add(duration)

				// Skip past slots or within minimum notice
				if slotEnd.Before(minNotice) {
					continue
				}

				// Check against blocked slots
				if isBlocked(slotStart, slotEnd, blockedToday, loc) {
					continue
				}

				// Check against existing bookings
				if overlapsBooking(slotStart, slotEnd, bookings) {
					continue
				}

				slots = append(slots, SlotResponse{
					ExpertID: a.ExpertID,
					StartsAt: slotStart,
					EndsAt:   slotEnd,
					Duration: durationMinutes,
				})
			}
		}
	}

	return slots
}

func isBlocked(slotStart, slotEnd time.Time, blockedSlots []db.CoachingBlockedSlot, loc *time.Location) bool {
	for _, b := range blockedSlots {
		// Full day block
		if !b.StartTime.Valid || !b.EndTime.Valid {
			return true
		}

		bDate := b.BlockedDate.Time
		bStartH := int(b.StartTime.Microseconds / int64(time.Hour/time.Microsecond))
		bStartM := int((b.StartTime.Microseconds % int64(time.Hour/time.Microsecond)) / int64(time.Minute/time.Microsecond))
		bEndH := int(b.EndTime.Microseconds / int64(time.Hour/time.Microsecond))
		bEndM := int((b.EndTime.Microseconds % int64(time.Hour/time.Microsecond)) / int64(time.Minute/time.Microsecond))

		blockStart := time.Date(bDate.Year(), bDate.Month(), bDate.Day(), bStartH, bStartM, 0, 0, loc).UTC()
		blockEnd := time.Date(bDate.Year(), bDate.Month(), bDate.Day(), bEndH, bEndM, 0, 0, loc).UTC()

		if slotStart.Before(blockEnd) && slotEnd.After(blockStart) {
			return true
		}
	}
	return false
}

func overlapsBooking(slotStart, slotEnd time.Time, bookings []db.CoachingBooking) bool {
	for _, b := range bookings {
		bookingStart := b.ScheduledAt.Time
		bookingEnd := bookingStart.Add(time.Duration(b.DurationMinutes) * time.Minute)
		if slotStart.Before(bookingEnd) && slotEnd.After(bookingStart) {
			return true
		}
	}
	return false
}

// --- Bookings ---

type bookingResponse struct {
	ID                 string    `json:"id"`
	ExpertID           string    `json:"expert_id"`
	ExpertName         string    `json:"expert_name"`
	StudentID          string    `json:"student_id"`
	StudentName        string    `json:"student_name"`
	GroupID            string    `json:"group_id"`
	SessionTypeID      string    `json:"session_type_id"`
	SessionTypeName    string    `json:"session_type_name,omitempty"`
	ScheduledAt        time.Time `json:"scheduled_at"`
	DurationMinutes    int32     `json:"duration_minutes"`
	Status             string    `json:"status"`
	CancellationReason *string   `json:"cancellation_reason,omitempty"`
	CancelledBy        *string   `json:"cancelled_by,omitempty"`
	Notes              *string   `json:"notes,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

func toBookingResponse(b db.CoachingBooking, users map[string]userInfo, sessionTypeName string) bookingResponse {
	expertUser := users[b.ExpertID]
	studentUser := users[b.StudentID]
	expertName := (expertUser.FirstName + " " + expertUser.LastName)
	studentName := (studentUser.FirstName + " " + studentUser.LastName)

	resp := bookingResponse{
		ID:              uuidToString(b.ID),
		ExpertID:        b.ExpertID,
		ExpertName:      expertName,
		StudentID:       b.StudentID,
		StudentName:     studentName,
		GroupID:         uuidToString(b.GroupID),
		SessionTypeID:   uuidToString(b.SessionTypeID),
		SessionTypeName: sessionTypeName,
		ScheduledAt:     b.ScheduledAt.Time,
		DurationMinutes: b.DurationMinutes,
		Status:          string(b.Status),
		CreatedAt:       b.CreatedAt.Time,
	}
	if b.CancellationReason.Valid {
		resp.CancellationReason = &b.CancellationReason.String
	}
	if b.CancelledBy.Valid {
		resp.CancelledBy = &b.CancelledBy.String
	}
	if b.Notes.Valid {
		resp.Notes = &b.Notes.String
	}
	return resp
}

func toBookingResponseFromRow(b db.ListMyBookingsRow, users map[string]userInfo) bookingResponse {
	expertUser := users[b.ExpertID]
	studentUser := users[b.StudentID]

	resp := bookingResponse{
		ID:              uuidToString(b.ID),
		ExpertID:        b.ExpertID,
		ExpertName:      expertUser.FirstName + " " + expertUser.LastName,
		StudentID:       b.StudentID,
		StudentName:     studentUser.FirstName + " " + studentUser.LastName,
		GroupID:         uuidToString(b.GroupID),
		SessionTypeID:   uuidToString(b.SessionTypeID),
		SessionTypeName: b.SessionTypeName,
		ScheduledAt:     b.ScheduledAt.Time,
		DurationMinutes: b.DurationMinutes,
		Status:          string(b.Status),
		CreatedAt:       b.CreatedAt.Time,
	}
	if b.CancellationReason.Valid {
		resp.CancellationReason = &b.CancellationReason.String
	}
	if b.CancelledBy.Valid {
		resp.CancelledBy = &b.CancelledBy.String
	}
	if b.Notes.Valid {
		resp.Notes = &b.Notes.String
	}
	return resp
}

func toBookingResponseFromGroupRow(b db.ListGroupBookingsRow, users map[string]userInfo) bookingResponse {
	expertUser := users[b.ExpertID]
	studentUser := users[b.StudentID]

	resp := bookingResponse{
		ID:              uuidToString(b.ID),
		ExpertID:        b.ExpertID,
		ExpertName:      expertUser.FirstName + " " + expertUser.LastName,
		StudentID:       b.StudentID,
		StudentName:     studentUser.FirstName + " " + studentUser.LastName,
		GroupID:         uuidToString(b.GroupID),
		SessionTypeID:   uuidToString(b.SessionTypeID),
		SessionTypeName: b.SessionTypeName,
		ScheduledAt:     b.ScheduledAt.Time,
		DurationMinutes: b.DurationMinutes,
		Status:          string(b.Status),
		CreatedAt:       b.CreatedAt.Time,
	}
	if b.CancellationReason.Valid {
		resp.CancellationReason = &b.CancellationReason.String
	}
	if b.CancelledBy.Valid {
		resp.CancelledBy = &b.CancelledBy.String
	}
	if b.Notes.Valid {
		resp.Notes = &b.Notes.String
	}
	return resp
}

type CreateBookingRequest struct {
	ExpertID      string  `json:"expert_id"`
	SessionTypeID string  `json:"session_type_id"`
	ScheduledAt   string  `json:"scheduled_at"` // RFC3339
	Notes         *string `json:"notes,omitempty"`
}

func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingBook) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req CreateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ExpertID == "" {
		http.Error(w, "expert_id is required", http.StatusBadRequest)
		return
	}

	sessionTypeID, err := parseUUID(req.SessionTypeID)
	if err != nil {
		http.Error(w, "Invalid session_type_id", http.StatusBadRequest)
		return
	}

	// Load session type to get duration
	sessionType, err := h.q.GetSessionType(ctx, db.GetSessionTypeParams{
		ID:      sessionTypeID,
		GroupID: groupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Session type not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "get_session_type_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to get session type", http.StatusInternalServerError)
		return
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		http.Error(w, "Invalid scheduled_at (use RFC3339)", http.StatusBadRequest)
		return
	}

	// Enforce minimum booking notice
	if time.Until(scheduledAt) < MinBookingNotice {
		http.Error(w, "Sessions must be booked at least 2 hours in advance", http.StatusBadRequest)
		return
	}

	slotStart := pgtype.Timestamptz{}
	_ = slotStart.Scan(scheduledAt)
	slotEnd := pgtype.Timestamptz{}
	_ = slotEnd.Scan(scheduledAt.Add(time.Duration(sessionType.DurationMinutes) * time.Minute))

	var notes pgtype.Text
	if req.Notes != nil {
		notes = pgtype.Text{String: *req.Notes, Valid: true}
	}

	// TOCTOU-safe booking: use a SERIALIZABLE transaction so that concurrent
	// check-then-insert sequences are serialized at the DB level. On serialization
	// failure (pgconn error code 40001) we retry up to 3 times.
	var booking db.CoachingBooking
	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		tx, err := h.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
		if err != nil {
			log.ErrorContext(ctx, "begin_tx_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to create booking", http.StatusInternalServerError)
			return
		}

		qtx := h.q.WithTx(tx)

		conflicts, err := qtx.CountConflictingBookings(ctx, db.CountConflictingBookingsParams{
			ExpertID:      req.ExpertID,
			ScheduledAt:   slotStart,
			ScheduledAt_2: slotEnd,
		})
		if err != nil {
			_ = tx.Rollback(ctx)
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "40001" && attempt < maxRetries-1 {
				continue
			}
			log.ErrorContext(ctx, "count_conflicts_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to check conflicts", http.StatusInternalServerError)
			return
		}
		if conflicts > 0 {
			_ = tx.Rollback(ctx)
			http.Error(w, "Time slot is no longer available", http.StatusConflict)
			return
		}

		booking, err = qtx.CreateBooking(ctx, db.CreateBookingParams{
			ExpertID:        req.ExpertID,
			StudentID:       user.ID,
			GroupID:         groupID,
			SessionTypeID:   sessionTypeID,
			ScheduledAt:     slotStart,
			DurationMinutes: sessionType.DurationMinutes,
			Notes:           notes,
		})
		if err != nil {
			_ = tx.Rollback(ctx)
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "40001" && attempt < maxRetries-1 {
				continue
			}
			log.ErrorContext(ctx, "create_booking_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to create booking", http.StatusInternalServerError)
			return
		}

		if err = tx.Commit(ctx); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "40001" && attempt < maxRetries-1 {
				continue
			}
			log.ErrorContext(ctx, "commit_booking_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to create booking", http.StatusInternalServerError)
			return
		}
		break
	}

	// Send email notifications (best effort)
	h.sendBookingCreatedEmail(ctx, booking)

	users := h.resolveUsers(ctx, []string{booking.ExpertID, booking.StudentID})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toBookingResponse(booking, users, sessionType.Name))
}

func (h *Handler) ListMyBookings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingBookingsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	bookings, err := h.q.ListMyBookings(ctx, db.ListMyBookingsParams{
		ExpertID: user.ID,
		GroupID:  groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_bookings_failed",
			slog.String("component", "coaching"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list bookings", http.StatusInternalServerError)
		return
	}

	if bookings == nil {
		bookings = []db.ListMyBookingsRow{}
	}

	// Collect unique user IDs for name resolution
	userIDSet := make(map[string]struct{}, len(bookings)*2)
	for _, b := range bookings {
		userIDSet[b.ExpertID] = struct{}{}
		userIDSet[b.StudentID] = struct{}{}
	}
	userIDs := make([]string, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}
	users := h.resolveUsers(ctx, userIDs)

	resp := make([]bookingResponse, len(bookings))
	for i, b := range bookings {
		resp[i] = toBookingResponseFromRow(b, users)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) ListGroupSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingBookingsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, err := parseUUID(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	bookings, err := h.q.ListGroupBookings(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "list_group_sessions_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list group sessions", http.StatusInternalServerError)
		return
	}

	if bookings == nil {
		bookings = []db.ListGroupBookingsRow{}
	}

	// Collect unique user IDs for name resolution
	userIDSet := make(map[string]struct{}, len(bookings)*2)
	for _, b := range bookings {
		userIDSet[b.ExpertID] = struct{}{}
		userIDSet[b.StudentID] = struct{}{}
	}
	userIDs := make([]string, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}
	users := h.resolveUsers(ctx, userIDs)

	resp := make([]bookingResponse, len(bookings))
	for i, b := range bookings {
		resp[i] = toBookingResponseFromGroupRow(b, users)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type UpdateBookingStatusRequest struct {
	Status             string  `json:"status"`
	CancellationReason *string `json:"cancellation_reason,omitempty"`
}

func (h *Handler) UpdateBookingStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingBookingsManage) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	bookingID, err := parseUUID(chi.URLParam(r, "bookingID"))
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	var req UpdateBookingStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate status transitions
	switch req.Status {
	case "cancelled", "completed":
		// allowed
	default:
		http.Error(w, "Invalid status; allowed: cancelled, completed", http.StatusBadRequest)
		return
	}

	// Fetch the booking to verify ownership and timing.
	// GetBooking is scoped to expert_id OR student_id, ensuring the caller is a participant.
	existing, err := h.q.GetBooking(ctx, db.GetBookingParams{
		ID:       bookingID,
		ExpertID: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Booking not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch booking", http.StatusInternalServerError)
		return
	}

	// Auth check: student can cancel their own, expert can cancel/complete their own sessions
	isByStudent := existing.StudentID == user.ID && req.Status == "cancelled"
	isByExpert := existing.ExpertID == user.ID
	hasManage := permissions.HasPermission(user.Permissions, permissions.CoachingBookingsManage)

	if !isByStudent && !isByExpert && !hasManage {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	// Enforce cancellation notice
	if req.Status == "cancelled" {
		if time.Until(existing.ScheduledAt.Time) < CancellationNotice {
			http.Error(w, "Cancellations must be made at least 1 hour before the session", http.StatusBadRequest)
			return
		}
	}

	// Expert can only mark their own sessions as completed
	if req.Status == "completed" && !isByExpert && !hasManage {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var cancelReason pgtype.Text
	var cancelledBy pgtype.Text
	if req.Status == "cancelled" {
		if req.CancellationReason != nil {
			cancelReason = pgtype.Text{String: *req.CancellationReason, Valid: true}
		}
		cancelledBy = pgtype.Text{String: user.ID, Valid: true}
	}

	updated, err := h.q.UpdateBookingStatus(ctx, db.UpdateBookingStatusParams{
		ID:                 bookingID,
		Status:             db.CoachingBookingStatus(req.Status),
		CancellationReason: cancelReason,
		CancelledBy:        cancelledBy,
		ExpertID:           user.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "update_booking_status_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update booking", http.StatusInternalServerError)
		return
	}

	if req.Status == "cancelled" {
		h.sendCancellationEmail(ctx, updated, user.ID)
	}

	users := h.resolveUsers(ctx, []string{updated.ExpertID, updated.StudentID})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toBookingResponse(updated, users, ""))
}

// --- Email helpers ---

func (h *Handler) sendBookingCreatedEmail(ctx context.Context, b db.CoachingBooking) {
	log := logger.From(ctx, h.logger)
	scheduledStr := b.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")
	subject := "Live Coaching Session Confirmed"
	body := "Your live coaching session has been confirmed.\n\nDate & Time: " + scheduledStr +
		"\nDuration: " + formatDuration(b.DurationMinutes)

	// In the real system, we'd look up user emails from WorkOS. For now, log the intent.
	log.InfoContext(ctx, "booking_created_email_queued",
		slog.String("component", "coaching"),
		slog.String("expert_id", b.ExpertID),
		slog.String("student_id", b.StudentID),
		slog.String("scheduled_at", scheduledStr),
	)
	_ = subject
	_ = body
}

func (h *Handler) sendCancellationEmail(ctx context.Context, b db.CoachingBooking, cancelledByID string) {
	log := logger.From(ctx, h.logger)
	scheduledStr := b.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")
	log.InfoContext(ctx, "booking_cancelled_email_queued",
		slog.String("component", "coaching"),
		slog.String("expert_id", b.ExpertID),
		slog.String("student_id", b.StudentID),
		slog.String("cancelled_by", cancelledByID),
		slog.String("scheduled_at", scheduledStr),
	)
}

// --- Helpers ---

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}

func parseUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}

func parseTime(s string) (pgtype.Time, error) {
	t, err := time.Parse("15:04", s)
	if err != nil {
		return pgtype.Time{}, err
	}
	micros := int64(t.Hour())*int64(time.Hour/time.Microsecond) +
		int64(t.Minute())*int64(time.Minute/time.Microsecond)
	return pgtype.Time{Microseconds: micros, Valid: true}, nil
}

func pgTimeToString(t pgtype.Time) string {
	if !t.Valid {
		return ""
	}
	h := t.Microseconds / int64(time.Hour/time.Microsecond)
	m := (t.Microseconds % int64(time.Hour/time.Microsecond)) / int64(time.Minute/time.Microsecond)
	return fmt.Sprintf("%02d:%02d", h, m)
}

func formatDuration(minutes int32) string {
	if minutes < 60 {
		return fmt.Sprintf("%d minutes", minutes)
	}
	h := minutes / 60
	m := minutes % 60
	if m == 0 {
		return fmt.Sprintf("%d hour(s)", h)
	}
	return fmt.Sprintf("%d hour(s) %d minutes", h, m)
}
