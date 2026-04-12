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
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

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

type availabilityRequest struct {
	DayOfWeek int16  `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
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

	groupID, err := parseGroupID(r)
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
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list availability", http.StatusInternalServerError)
		return
	}

	if avail == nil {
		avail = []db.CoachingAvailability{}
	}

	resp := make([]availabilityResponse, len(avail))
	for i, a := range avail {
		resp[i] = toAvailabilityResponse(a)
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateAvailability(w http.ResponseWriter, r *http.Request) {
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

	var req availabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DayOfWeek < 0 || req.DayOfWeek > 6 {
		http.Error(w, "day_of_week must be 0–6", http.StatusBadRequest)
		return
	}

	startTime, endTime, errMsg := parseTimeRange(req.StartTime, req.EndTime)
	if errMsg != "" {
		http.Error(w, errMsg, http.StatusBadRequest)
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

	writeJSON(w, http.StatusCreated, toAvailabilityResponse(avail))
}

func (h *Handler) UpdateAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	availabilityID, err := parseUUID(chi.URLParam(r, "availabilityID"))
	if err != nil {
		http.Error(w, "Invalid availability ID", http.StatusBadRequest)
		return
	}

	groupID, err := parseGroupID(r)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req availabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	startTime, endTime, errMsg := parseTimeRange(req.StartTime, req.EndTime)
	if errMsg != "" {
		http.Error(w, errMsg, http.StatusBadRequest)
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

	writeJSON(w, http.StatusOK, toAvailabilityResponse(avail))
}

func (h *Handler) DeleteAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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
