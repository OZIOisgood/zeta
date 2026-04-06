package groups

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// groupResponse is a JSON-safe DTO for db.Group.
type groupResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	OwnerID     string  `json:"owner_id"`
	Avatar      *string `json:"avatar"`
	Description string  `json:"description"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

func toGroupResponse(g db.Group) groupResponse {
	var avatar *string
	if len(g.Avatar) > 0 {
		enc := fmt.Sprintf("data:image/jpeg;base64,%s", base64.StdEncoding.EncodeToString(g.Avatar))
		avatar = &enc
	}
	return groupResponse{
		ID:          toUUIDString(g.ID),
		Name:        g.Name,
		OwnerID:     g.OwnerID,
		Avatar:      avatar,
		Description: g.Description,
		CreatedAt:   g.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:   g.UpdatedAt.Time.Format(time.RFC3339),
	}
}

func toUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}

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

	if !permissions.HasPermission(user.Permissions, permissions.GroupsRead) {
		log.WarnContext(ctx, "group_read_permission_denied",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.String("role", user.Role),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
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

	// Map to DTO to ensure JSON-safe serialization
	dtos := make([]groupResponse, len(groups))
	for i, g := range groups {
		dtos[i] = toGroupResponse(db.Group{
			ID:        g.ID,
			Name:      g.Name,
			OwnerID:   g.OwnerID,
			Avatar:    g.Avatar,
			CreatedAt: g.CreatedAt,
			UpdatedAt: g.UpdatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

type CreateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Avatar      string `json:"avatar"` // Base64 encoded image data, max 300KB
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.GroupsCreate) {
		log.WarnContext(ctx, "group_create_permission_denied",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.String("role", user.Role),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
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
		Name:        req.Name,
		OwnerID:     user.ID,
		Avatar:      avatarData,
		Description: req.Description,
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
	json.NewEncoder(w).Encode(toGroupResponse(group))
}

func (h *Handler) GetGroupByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.GroupsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	var groupID pgtype.UUID
	if err := groupID.Scan(groupIDStr); err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	inGroup, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  user.ID,
		GroupID: groupID,
	})
	if err != nil || !inGroup {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	group, err := h.q.GetGroup(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "group_get_failed",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toGroupResponse(group))
}

type UpdateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Avatar      string `json:"avatar"` // Base64 encoded, optional
}

func (h *Handler) UpdateGroupPreferences(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.GroupsPreferencesEdit) {
		log.WarnContext(ctx, "group_preferences_edit_permission_denied",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	var groupID pgtype.UUID
	if err := groupID.Scan(groupIDStr); err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	inGroup, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  user.ID,
		GroupID: groupID,
	})
	if err != nil || !inGroup {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req UpdateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Fetch existing avatar to keep it if none provided
	existing, err := h.q.GetGroup(ctx, groupID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	avatarData := existing.Avatar
	if req.Avatar != "" {
		decoded, err := base64.StdEncoding.DecodeString(req.Avatar)
		if err != nil {
			http.Error(w, "Invalid avatar data", http.StatusBadRequest)
			return
		}
		if len(decoded) > 300*1024 {
			http.Error(w, "Avatar size exceeds 300KB limit", http.StatusBadRequest)
			return
		}
		avatarData = decoded
	}

	group, err := h.q.UpdateGroup(ctx, db.UpdateGroupParams{
		ID:          groupID,
		Name:        req.Name,
		Description: req.Description,
		Avatar:      avatarData,
	})
	if err != nil {
		log.ErrorContext(ctx, "group_update_failed",
			slog.String("component", "groups"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update group", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "group_updated",
		slog.String("component", "groups"),
		slog.String("user_id", user.ID),
		slog.String("group_id", groupIDStr),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toGroupResponse(group))
}
