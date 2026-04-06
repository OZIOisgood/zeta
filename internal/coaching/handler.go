package coaching

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	q      *db.Queries
	email  *email.Service
	logger *slog.Logger
}

func NewHandler(q *db.Queries, email *email.Service, logger *slog.Logger) *Handler {
	return &Handler{
		q:      q,
		email:  email,
		logger: logger,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateSession)
	r.Get("/", h.ListSessions)
	r.Get("/{id}", h.GetSession)
	r.Put("/{id}", h.UpdateSession)
	r.Post("/{id}/cancel", h.CancelSession)
	r.Get("/{id}/connect", h.Connect)
}

// --- DTOs ---

type createSessionRequest struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	GroupID         string `json:"group_id"`
	ScheduledAt     string `json:"scheduled_at"`
	DurationMinutes int32  `json:"duration_minutes"`
}

type updateSessionRequest struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	ScheduledAt     string `json:"scheduled_at"`
	DurationMinutes int32  `json:"duration_minutes"`
}

type sessionResponse struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	GroupID         string `json:"group_id"`
	GroupName       string `json:"group_name"`
	StudentID       string `json:"student_id"`
	ExpertID        string `json:"expert_id"`
	Status          string `json:"status"`
	ScheduledAt     string `json:"scheduled_at"`
	DurationMinutes int32  `json:"duration_minutes"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

type connectResponse struct {
	AppID   string `json:"app_id"`
	Channel string `json:"channel"`
	Token   string `json:"token"`
	UID     uint32 `json:"uid"`
}

// --- Handlers ---

func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingCreate) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req createSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || len(req.Title) < 5 || len(req.Title) > 75 {
		http.Error(w, "Title must be between 5 and 75 characters", http.StatusBadRequest)
		return
	}
	if req.GroupID == "" || req.ScheduledAt == "" {
		http.Error(w, "group_id and scheduled_at are required", http.StatusBadRequest)
		return
	}
	if req.DurationMinutes <= 0 {
		req.DurationMinutes = 60
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		http.Error(w, "scheduled_at must be in RFC3339 format", http.StatusBadRequest)
		return
	}

	var groupID pgtype.UUID
	if err := groupID.Scan(req.GroupID); err != nil {
		http.Error(w, "Invalid group_id", http.StatusBadRequest)
		return
	}

	// Fetch the group to validate membership and get owner as expert
	group, err := h.q.GetGroup(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "coaching_get_group_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	// Validate that the student is a member of the group
	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  user.ID,
		GroupID: groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "coaching_check_group_membership_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "You are not a member of this group", http.StatusForbidden)
		return
	}

	// The group owner is automatically assigned as the expert
	expertID := group.OwnerID

	session, err := h.q.CreateCoachingSession(ctx, db.CreateCoachingSessionParams{
		Title:           req.Title,
		Description:     req.Description,
		GroupID:         groupID,
		StudentID:       user.ID,
		ExpertID:        expertID,
		ScheduledAt:     pgtype.Timestamptz{Time: scheduledAt, Valid: true},
		DurationMinutes: req.DurationMinutes,
	})
	if err != nil {
		log.ErrorContext(ctx, "coaching_create_session_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Create reminders row with pre-marked tiers for late-created sessions
	timeUntilSession := time.Until(scheduledAt)
	_, err = h.q.CreateCoachingSessionReminder(ctx, db.CreateCoachingSessionReminderParams{
		SessionID:       session.ID,
		Reminder24hSent: timeUntilSession < 24*time.Hour,
		Reminder1hSent:  timeUntilSession < time.Hour,
		Reminder15mSent: timeUntilSession < 15*time.Minute,
	})
	if err != nil {
		log.ErrorContext(ctx, "coaching_create_reminder_failed",
			slog.String("component", "coaching"),
			slog.String("session_id", toUUIDString(session.ID)),
			slog.Any("err", err),
		)
		// Non-fatal: session was created, reminder row failed
	}

	log.InfoContext(ctx, "coaching_session_created",
		slog.String("component", "coaching"),
		slog.String("session_id", toUUIDString(session.ID)),
		slog.String("student_id", user.ID),
		slog.String("expert_id", expertID),
	)

	groupName := group.Name

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toSessionResponse(session, groupName))
}

func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingRead) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var sessions []sessionResponse

	switch user.Role {
	case permissions.RoleAdmin:
		rows, err := h.q.ListCoachingSessionsAll(ctx)
		if err != nil {
			log.ErrorContext(ctx, "coaching_list_sessions_failed",
				slog.String("component", "coaching"),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to list sessions", http.StatusInternalServerError)
			return
		}
		sessions = make([]sessionResponse, len(rows))
		for i, row := range rows {
			sessions[i] = toSessionResponseFromListRow(row)
		}
	case permissions.RoleExpert:
		rows, err := h.q.ListCoachingSessionsByExpert(ctx, user.ID)
		if err != nil {
			log.ErrorContext(ctx, "coaching_list_sessions_failed",
				slog.String("component", "coaching"),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to list sessions", http.StatusInternalServerError)
			return
		}
		sessions = make([]sessionResponse, len(rows))
		for i, row := range rows {
			sessions[i] = toSessionResponseFromListRow(row)
		}
	default: // student
		rows, err := h.q.ListCoachingSessionsByStudent(ctx, user.ID)
		if err != nil {
			log.ErrorContext(ctx, "coaching_list_sessions_failed",
				slog.String("component", "coaching"),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to list sessions", http.StatusInternalServerError)
			return
		}
		sessions = make([]sessionResponse, len(rows))
		for i, row := range rows {
			sessions[i] = toSessionResponseFromListRow(row)
		}
	}

	if sessions == nil {
		sessions = []sessionResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingRead) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	id, err := parseID(r)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	session, err := h.q.GetCoachingSession(ctx, id)
	if err != nil {
		log.ErrorContext(ctx, "coaching_get_session_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	// Non-admins can only see sessions they participate in
	if user.Role != permissions.RoleAdmin &&
		session.StudentID != user.ID &&
		session.ExpertID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toSessionResponseFromGetRow(session))
}

func (h *Handler) UpdateSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingEdit) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	id, err := parseID(r)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	// Verify the user is the student who created it or an admin
	session, err := h.q.GetCoachingSession(ctx, id)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if user.Role != permissions.RoleAdmin && session.StudentID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req updateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || len(req.Title) < 5 || len(req.Title) > 75 {
		http.Error(w, "Title must be between 5 and 75 characters", http.StatusBadRequest)
		return
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		http.Error(w, "scheduled_at must be in RFC3339 format", http.StatusBadRequest)
		return
	}

	if req.DurationMinutes <= 0 {
		req.DurationMinutes = 60
	}

	updated, err := h.q.UpdateCoachingSession(ctx, db.UpdateCoachingSessionParams{
		ID:              id,
		Title:           req.Title,
		Description:     req.Description,
		ScheduledAt:     pgtype.Timestamptz{Time: scheduledAt, Valid: true},
		DurationMinutes: req.DurationMinutes,
	})
	if err != nil {
		log.ErrorContext(ctx, "coaching_update_session_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update session", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "coaching_session_updated",
		slog.String("component", "coaching"),
		slog.String("session_id", toUUIDString(id)),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toSessionResponse(updated, session.GroupName))
}

func (h *Handler) CancelSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingCancel) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	id, err := parseID(r)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	// Non-admins can only cancel their own sessions
	session, err := h.q.GetCoachingSession(ctx, id)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if user.Role != permissions.RoleAdmin &&
		session.StudentID != user.ID &&
		session.ExpertID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := h.q.CancelCoachingSession(ctx, id); err != nil {
		log.ErrorContext(ctx, "coaching_cancel_session_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to cancel session", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "coaching_session_cancelled",
		slog.String("component", "coaching"),
		slog.String("session_id", toUUIDString(id)),
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}

func (h *Handler) Connect(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.CoachingRead) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	id, err := parseID(r)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	session, err := h.q.GetCoachingSession(ctx, id)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	// Only the student or expert can connect
	if session.StudentID != user.ID && session.ExpertID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Time window check: 15 min before through end of session
	now := time.Now()
	windowStart := session.ScheduledAt.Time.Add(-15 * time.Minute)
	windowEnd := session.ScheduledAt.Time.Add(time.Duration(session.DurationMinutes) * time.Minute)
	if now.Before(windowStart) || now.After(windowEnd) {
		http.Error(w, "Session is not available for connection at this time", http.StatusForbidden)
		return
	}

	if session.Status == db.CoachingSessionStatusCancelled {
		http.Error(w, "Session has been cancelled", http.StatusBadRequest)
		return
	}

	// Update status to in_progress if still scheduled
	if session.Status == db.CoachingSessionStatusScheduled {
		_ = h.q.UpdateCoachingSessionStatus(ctx, db.UpdateCoachingSessionStatusParams{
			ID:     id,
			Status: db.CoachingSessionStatusInProgress,
		})
	}

	channel := ChannelName(toUUIDString(id))
	uid := UserUID(user.ID)

	appID, token, err := GenerateToken(channel, uid)
	if err != nil {
		log.ErrorContext(ctx, "coaching_generate_token_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to generate connection token", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "coaching_session_connect",
		slog.String("component", "coaching"),
		slog.String("session_id", toUUIDString(id)),
		slog.String("user_id", user.ID),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(connectResponse{
		AppID:   appID,
		Channel: channel,
		Token:   token,
		UID:     uid,
	})
}

// --- Helpers ---

func parseID(r *http.Request) (pgtype.UUID, error) {
	idStr := chi.URLParam(r, "id")
	var uuid pgtype.UUID
	if err := uuid.Scan(idStr); err != nil {
		return uuid, err
	}
	return uuid, nil
}

func toUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}

func toSessionResponse(s db.CoachingSession, groupName string) sessionResponse {
	return sessionResponse{
		ID:              toUUIDString(s.ID),
		Title:           s.Title,
		Description:     s.Description,
		GroupID:         toUUIDString(s.GroupID),
		GroupName:       groupName,
		StudentID:       s.StudentID,
		ExpertID:        s.ExpertID,
		Status:          string(s.Status),
		ScheduledAt:     s.ScheduledAt.Time.Format(time.RFC3339),
		DurationMinutes: s.DurationMinutes,
		CreatedAt:       s.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:       s.UpdatedAt.Time.Format(time.RFC3339),
	}
}

// toSessionResponseFromListRow converts the list query row type (shared by all three list queries)
// to a sessionResponse. All three list queries return the same columns.
func toSessionResponseFromListRow(row interface{}) sessionResponse {
	switch r := row.(type) {
	case db.ListCoachingSessionsAllRow:
		return sessionResponse{
			ID:              toUUIDString(r.ID),
			Title:           r.Title,
			Description:     r.Description,
			GroupID:         toUUIDString(r.GroupID),
			GroupName:       r.GroupName,
			StudentID:       r.StudentID,
			ExpertID:        r.ExpertID,
			Status:          string(r.Status),
			ScheduledAt:     r.ScheduledAt.Time.Format(time.RFC3339),
			DurationMinutes: r.DurationMinutes,
			CreatedAt:       r.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:       r.UpdatedAt.Time.Format(time.RFC3339),
		}
	case db.ListCoachingSessionsByExpertRow:
		return sessionResponse{
			ID:              toUUIDString(r.ID),
			Title:           r.Title,
			Description:     r.Description,
			GroupID:         toUUIDString(r.GroupID),
			GroupName:       r.GroupName,
			StudentID:       r.StudentID,
			ExpertID:        r.ExpertID,
			Status:          string(r.Status),
			ScheduledAt:     r.ScheduledAt.Time.Format(time.RFC3339),
			DurationMinutes: r.DurationMinutes,
			CreatedAt:       r.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:       r.UpdatedAt.Time.Format(time.RFC3339),
		}
	case db.ListCoachingSessionsByStudentRow:
		return sessionResponse{
			ID:              toUUIDString(r.ID),
			Title:           r.Title,
			Description:     r.Description,
			GroupID:         toUUIDString(r.GroupID),
			GroupName:       r.GroupName,
			StudentID:       r.StudentID,
			ExpertID:        r.ExpertID,
			Status:          string(r.Status),
			ScheduledAt:     r.ScheduledAt.Time.Format(time.RFC3339),
			DurationMinutes: r.DurationMinutes,
			CreatedAt:       r.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:       r.UpdatedAt.Time.Format(time.RFC3339),
		}
	default:
		return sessionResponse{}
	}
}

func toSessionResponseFromGetRow(r db.GetCoachingSessionRow) sessionResponse {
	return sessionResponse{
		ID:              toUUIDString(r.ID),
		Title:           r.Title,
		Description:     r.Description,
		GroupID:         toUUIDString(r.GroupID),
		GroupName:       r.GroupName,
		StudentID:       r.StudentID,
		ExpertID:        r.ExpertID,
		Status:          string(r.Status),
		ScheduledAt:     r.ScheduledAt.Time.Format(time.RFC3339),
		DurationMinutes: r.DurationMinutes,
		CreatedAt:       r.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:       r.UpdatedAt.Time.Format(time.RFC3339),
	}
}
