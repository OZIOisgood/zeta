package coaching

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/logger"
)

// ExpertInfo is the public shape returned by ListExpertsInGroup.
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

	groupID, err := parseGroupID(r)
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
	json.NewEncoder(w).Encode(resp) //nolint:errcheck
}
