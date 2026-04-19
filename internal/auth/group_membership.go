package auth

import (
	"log/slog"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// RequireGroupMembership returns a middleware that verifies the authenticated user is a
// member of the group identified by the {groupID} URL parameter. Unauthenticated requests
// get 401; non-members get 403.
func RequireGroupMembership(q db.Querier, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			user := GetUser(ctx)
			if user == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			groupIDStr := chi.URLParam(r, "groupID")
			var groupID pgtype.UUID
			if err := groupID.Scan(groupIDStr); err != nil {
				http.Error(w, "Invalid group ID", http.StatusBadRequest)
				return
			}

			isMember, err := q.CheckUserGroup(ctx, db.CheckUserGroupParams{
				UserID:  user.ID,
				GroupID: groupID,
			})
			if err != nil {
				logger.ErrorContext(ctx, "check_group_membership_failed",
					slog.String("component", "auth"),
					slog.String("user_id", user.ID),
					slog.String("group_id", groupIDStr),
					slog.Any("err", err),
				)
				http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
				return
			}
			if !isMember {
				http.Error(w, "Forbidden: not a member of this group", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
