package coaching

import (
	"context"
	"log/slog"
	"sync"

	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type userInfo struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar,omitempty"`
}

// resolveUsers fetches user details from WorkOS for a set of user IDs concurrently.
// Returns a map of userID → userInfo. Errors are logged and the user is omitted.
func (h *Handler) resolveUsers(ctx context.Context, userIDs []string) map[string]userInfo {
	unique := make(map[string]struct{}, len(userIDs))
	for _, id := range userIDs {
		unique[id] = struct{}{}
	}

	result := make(map[string]userInfo, len(unique))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for uid := range unique {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			u, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{User: id})
			if err != nil {
				h.logger.WarnContext(ctx, "resolve_user_failed",
					slog.String("component", "coaching"),
					slog.String("user_id", id),
					slog.Any("err", err),
				)
				mu.Lock()
				result[id] = userInfo{ID: id, FirstName: id, LastName: ""}
				mu.Unlock()
				return
			}
			mu.Lock()
			result[id] = userInfo{
				ID:        u.ID,
				FirstName: u.FirstName,
				LastName:  u.LastName,
				Avatar:    u.ProfilePictureURL,
			}
			mu.Unlock()
		}(uid)
	}
	wg.Wait()
	return result
}

// resolveEmails fetches email addresses for given WorkOS user IDs.
func (h *Handler) resolveEmails(ctx context.Context, userIDs []string) []string {
	var emails []string
	for _, id := range userIDs {
		u, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{User: id})
		if err != nil {
			h.logger.WarnContext(ctx, "resolve_email_failed",
				slog.String("component", "coaching"),
				slog.String("user_id", id),
				slog.Any("err", err),
			)
			continue
		}
		if u.Email != "" {
			emails = append(emails, u.Email)
		}
	}
	return emails
}
