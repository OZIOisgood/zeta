package coaching

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

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

	now := time.Now()
	fromDate := pgtype.Date{}
	_ = fromDate.Scan(now.Format("2006-01-02"))
	toDate := pgtype.Date{}
	_ = toDate.Scan(now.AddDate(0, BlockedSlotRangeMonths, 0).Format("2006-01-02"))

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
	json.NewEncoder(w).Encode(resp) //nolint:errcheck
}

type createBlockedSlotRequest struct {
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

	var req createBlockedSlotRequest
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

	// start_time and end_time must be either both provided or both absent.
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
	json.NewEncoder(w).Encode(toBlockedSlotResponse(slot)) //nolint:errcheck
}

func (h *Handler) DeleteBlockedSlot(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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
