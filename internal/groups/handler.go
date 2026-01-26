package groups

import (
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
)

type Handler struct {
	q      *db.Queries
	logger *slog.Logger
}

func NewHandler(q *db.Queries, logger *slog.Logger) *Handler {
	return &Handler{
		q:      q,
		logger: logger,
	}
}

func (h *Handler) ListGroups(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groups, err := h.q.ListUserGroups(ctx, user.ID)
	if err != nil {
		log.ErrorContext(ctx, "group_list_failed",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list groups: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return empty array instead of null if no groups
	if groups == nil {
		groups = []db.Group{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

type CreateGroupRequest struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"` // Base64 encoded image data, max 300KB
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Decode avatar from base64 if provided
	var avatarData []byte
	if req.Avatar != "" {
		var err error
		avatarData, err = base64.StdEncoding.DecodeString(req.Avatar)
		if err != nil {
			http.Error(w, "Invalid avatar data", http.StatusBadRequest)
			return
		}

		// Validate avatar size (max 300KB)
		if len(avatarData) > 300*1024 {
			http.Error(w, "Avatar size exceeds 300KB limit", http.StatusBadRequest)
			return
		}
	}

	group, err := h.q.CreateGroup(ctx, db.CreateGroupParams{
		Name:    req.Name,
		OwnerID: user.ID,
		Avatar:  avatarData,
	})
	if err != nil {
		log.ErrorContext(ctx, "group_create_failed",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.String("group_name", req.Name),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create group", http.StatusInternalServerError)
		return
	}

	err = h.q.AddUserToGroup(ctx, db.AddUserToGroupParams{
		UserID:  user.ID,
		GroupID: group.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "group_user_add_failed",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.String("group_id", group.ID.String()),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to link user to group", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "group_created",
		slog.String("component", "groups"),
		slog.String("user_id", user.ID),
		slog.String("group_id", group.ID.String()),
		slog.String("group_name", req.Name),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(group)
}
