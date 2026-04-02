package users

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"sync"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// groupUser is the JSON shape returned to the frontend.
type groupUser struct {
	ID                string `json:"id"`
	Email             string `json:"email"`
	FirstName         string `json:"first_name"`
	LastName          string `json:"last_name"`
	ProfilePictureURL string `json:"profile_picture_url"`
	Role              string `json:"role"`
}

type Handler struct {
	logger *slog.Logger
	q      *db.Queries
	email  *email.Service
}

func NewHandler(logger *slog.Logger, q *db.Queries, emailService *email.Service) *Handler {
	return &Handler{
		logger: logger,
		q:      q,
		email:  emailService,
	}
}

func (h *Handler) ListGroupUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.GroupsUserListRead) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Get group member user IDs from DB
	memberIDs, err := h.q.ListGroupMembers(ctx, pgtype.UUID{Bytes: groupID, Valid: true})
	if err != nil {
		h.logger.ErrorContext(ctx, "users_list_group_members_failed",
			slog.String("component", "users"),
			slog.String("group_id", groupID.String()),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list group members", http.StatusInternalServerError)
		return
	}

	if len(memberIDs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": []groupUser{},
		})
		return
	}

	// Build a set of member IDs for fast lookup
	memberSet := make(map[string]struct{}, len(memberIDs))
	for _, id := range memberIDs {
		memberSet[id] = struct{}{}
	}

	// Fetch org memberships to get roles (single API call)
	orgID := os.Getenv("DEFAULT_ORG_ID")

	roleByUserID := make(map[string]string, len(memberIDs))
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		OrganizationID: orgID,
		Limit:          100,
	})
	if err != nil {
		h.logger.WarnContext(ctx, "users_list_org_memberships_failed",
			slog.String("component", "users"),
			slog.Any("err", err),
		)
		// Continue without roles — they'll default to empty
	} else {
		for _, m := range memberships.Data {
			if _, ok := memberSet[m.UserID]; ok {
				roleByUserID[m.UserID] = m.Role.Slug
			}
		}
	}

	// Fetch user details from WorkOS in parallel
	type result struct {
		user groupUser
		err  error
	}
	results := make([]result, len(memberIDs))
	var wg sync.WaitGroup

	for i, uid := range memberIDs {
		wg.Add(1)
		go func(idx int, userID string) {
			defer wg.Done()
			u, err := usermanagement.GetUser(ctx, usermanagement.GetUserOpts{
				User: userID,
			})
			if err != nil {
				results[idx] = result{err: err}
				return
			}
			results[idx] = result{
				user: groupUser{
					ID:                u.ID,
					Email:             u.Email,
					FirstName:         u.FirstName,
					LastName:          u.LastName,
					ProfilePictureURL: u.ProfilePictureURL,
					Role:              roleByUserID[userID],
				},
			}
		}(i, uid)
	}
	wg.Wait()

	users := make([]groupUser, 0, len(memberIDs))
	for _, r := range results {
		if r.err != nil {
			h.logger.WarnContext(ctx, "users_get_workos_user_failed",
				slog.String("component", "users"),
				slog.Any("err", r.err),
			)
			continue
		}
		users = append(users, r.user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": users,
	})
}

func (h *Handler) RemoveGroupUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := h.logger
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	targetUserID := chi.URLParam(r, "userID")
	if targetUserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.GroupsUserListDelete) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	pgGroupID := pgtype.UUID{Bytes: groupID, Valid: true}

	// Prevent removing the group owner
	group, err := h.q.GetGroup(ctx, pgGroupID)
	if err != nil {
		log.ErrorContext(ctx, "users_remove_get_group_failed",
			slog.String("component", "users"),
			slog.String("group_id", groupID.String()),
			slog.Any("err", err),
		)
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	if group.OwnerID == targetUserID {
		http.Error(w, "Cannot remove the group owner", http.StatusBadRequest)
		return
	}

	err = h.q.RemoveUserFromGroup(ctx, db.RemoveUserFromGroupParams{
		UserID:  targetUserID,
		GroupID: pgGroupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "users_remove_from_group_failed",
			slog.String("component", "users"),
			slog.String("group_id", groupID.String()),
			slog.String("target_user_id", targetUserID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to remove user from group", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "user_removed_from_group",
		slog.String("component", "users"),
		slog.String("user_id", user.ID),
		slog.String("target_user_id", targetUserID),
		slog.String("group_id", groupID.String()),
	)

	// Notify removed user
	go func() {
		bgCtx := context.Background()
		bgLog := h.logger.With(
			slog.String("component", "users"),
			slog.String("target_user_id", targetUserID),
		)

		removedUser, err := usermanagement.GetUser(bgCtx, usermanagement.GetUserOpts{
			User: targetUserID,
		})
		if err != nil {
			bgLog.ErrorContext(bgCtx, "users_remove_notification_fetch_failed",
				slog.Any("err", err),
			)
			return
		}

		if removedUser.Email == "" {
			bgLog.WarnContext(bgCtx, "users_remove_notification_no_email")
			return
		}

		subject := fmt.Sprintf("You have been removed from group '%s'", group.Name)
		text := fmt.Sprintf("You have been removed from the group '%s'.", group.Name)
		if err := h.email.Send([]string{removedUser.Email}, subject, text); err != nil {
			bgLog.ErrorContext(bgCtx, "users_remove_notification_send_failed",
				slog.Any("err", err),
			)
		} else {
			bgLog.InfoContext(bgCtx, "users_remove_notification_sent")
		}
	}()

	w.WriteHeader(http.StatusNoContent)
}
