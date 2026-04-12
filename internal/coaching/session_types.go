package coaching

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

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

type createSessionTypeRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	DurationMinutes int32  `json:"duration_minutes"`
}

// updateSessionTypeRequest reuses the same fields as create.
type updateSessionTypeRequest = createSessionTypeRequest

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
// Experts see only their own; others with CoachingSlotsRead see all active types in the group.
func (h *Handler) ListSessionTypes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupID, err := parseGroupID(r)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var types []db.CoachingSessionType

	if permissions.HasPermission(user.Permissions, permissions.CoachingAvailabilityManage) {
		types, err = h.q.ListSessionTypesByExpertGroup(ctx, db.ListSessionTypesByExpertGroupParams{
			ExpertID: user.ID,
			GroupID:  groupID,
		})
	} else if permissions.HasPermission(user.Permissions, permissions.CoachingSlotsRead) {
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
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateSessionType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupID, err := parseGroupID(r)
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

	writeJSON(w, http.StatusCreated, toSessionTypeResponse(st))
}

func (h *Handler) UpdateSessionType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	sessionTypeID, err := parseUUID(chi.URLParam(r, "sessionTypeID"))
	if err != nil {
		http.Error(w, "Invalid session type ID", http.StatusBadRequest)
		return
	}

	groupID, err := parseGroupID(r)
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

	writeJSON(w, http.StatusOK, toSessionTypeResponse(st))
}

func (h *Handler) DeactivateSessionType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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
