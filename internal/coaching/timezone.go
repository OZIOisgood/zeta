package coaching

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5"
)

type setTimezoneRequest struct {
	Timezone string `json:"timezone"`
}

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

	writeJSON(w, http.StatusOK, map[string]string{"timezone": tz})
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

	writeJSON(w, http.StatusOK, map[string]string{"timezone": req.Timezone})
}
