package users

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"sync"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
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
}

func NewHandler(logger *slog.Logger, q *db.Queries) *Handler {
	return &Handler{
		logger: logger,
		q:      q,
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

	if !permissions.HasPermission(user.Role, permissions.GroupsUserListRead) {
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
	if orgID == "" {
		orgID = "org_01KFQFSEEVTCBYCV85D12DZ35M"
	}

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
