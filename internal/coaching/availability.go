package coaching

import (
	"context"
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
	"github.com/jackc/pgx/v5/pgtype"
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

// mergeAvailabilityForDay loads all active availability slots for the given
// expert/group/day, merges overlapping or adjacent intervals, and replaces the
// existing rows in the database with the merged result.
func (h *Handler) mergeAvailabilityForDay(ctx context.Context, expertID string, groupID pgtype.UUID, dayOfWeek int16) error {
	slots, err := h.q.ListAvailabilityByExpertGroupDay(ctx, db.ListAvailabilityByExpertGroupDayParams{
		ExpertID:  expertID,
		GroupID:   groupID,
		DayOfWeek: dayOfWeek,
	})
	if err != nil {
		return err
	}
	if len(slots) <= 1 {
		return nil
	}

	// Build merged intervals (slots are already sorted by start_time from the query).
	type interval struct {
		start int64
		end   int64
	}
	merged := []interval{{slots[0].StartTime.Microseconds, slots[0].EndTime.Microseconds}}
	for _, s := range slots[1:] {
		last := &merged[len(merged)-1]
		if s.StartTime.Microseconds <= last.end {
			// Overlapping or adjacent — extend end if necessary.
			if s.EndTime.Microseconds > last.end {
				last.end = s.EndTime.Microseconds
			}
		} else {
			merged = append(merged, interval{s.StartTime.Microseconds, s.EndTime.Microseconds})
		}
	}

	// Nothing changed — no merges needed.
	if len(merged) == len(slots) {
		return nil
	}

	// Delete all existing slots for this day.
	for _, s := range slots {
		if _, err := h.q.DeleteAvailability(ctx, db.DeleteAvailabilityParams{
			ID:       s.ID,
			ExpertID: expertID,
		}); err != nil {
			return err
		}
	}

	// Re-insert merged slots.
	for _, iv := range merged {
		if _, err := h.q.CreateAvailability(ctx, db.CreateAvailabilityParams{
			ExpertID:  expertID,
			GroupID:   groupID,
			DayOfWeek: dayOfWeek,
			StartTime: pgtype.Time{Microseconds: iv.start, Valid: true},
			EndTime:   pgtype.Time{Microseconds: iv.end, Valid: true},
		}); err != nil {
			return err
		}
	}
	return nil
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

	if err := h.mergeAvailabilityForDay(ctx, user.ID, groupID, req.DayOfWeek); err != nil {
		log.ErrorContext(ctx, "merge_availability_failed",
			slog.String("component", "coaching"),
			slog.String("expert_id", user.ID),
			slog.Any("err", err),
		)
		// Non-fatal: slot was created, just return it as-is.
		writeJSON(w, http.StatusCreated, toAvailabilityResponse(avail))
		return
	}

	all, err := h.q.ListAvailabilityByExpertGroup(ctx, db.ListAvailabilityByExpertGroupParams{
		ExpertID: user.ID,
		GroupID:  groupID,
	})
	if err != nil {
		writeJSON(w, http.StatusCreated, toAvailabilityResponse(avail))
		return
	}
	resp := make([]availabilityResponse, len(all))
	for i, a := range all {
		resp[i] = toAvailabilityResponse(a)
	}
	writeJSON(w, http.StatusCreated, resp)
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

	if err := h.mergeAvailabilityForDay(ctx, user.ID, groupID, req.DayOfWeek); err != nil {
		log.ErrorContext(ctx, "merge_availability_failed",
			slog.String("component", "coaching"),
			slog.String("expert_id", user.ID),
			slog.Any("err", err),
		)
		writeJSON(w, http.StatusOK, toAvailabilityResponse(avail))
		return
	}

	all, err := h.q.ListAvailabilityByExpertGroup(ctx, db.ListAvailabilityByExpertGroupParams{
		ExpertID: user.ID,
		GroupID:  groupID,
	})
	if err != nil {
		writeJSON(w, http.StatusOK, toAvailabilityResponse(avail))
		return
	}
	resp := make([]availabilityResponse, len(all))
	for i, a := range all {
		resp[i] = toAvailabilityResponse(a)
	}
	writeJSON(w, http.StatusOK, resp)
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
