package coaching

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type userInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar,omitempty"`
}

// resolveUsers fetches display profiles from user_preferences concurrently.
func (h *Handler) resolveUsers(ctx context.Context, userIDs []string) (map[string]userInfo, error) {
	unique := make(map[string]struct{}, len(userIDs))
	for _, id := range userIDs {
		unique[id] = struct{}{}
	}

	result := make(map[string]userInfo, len(unique))
	var firstErr error
	var mu sync.Mutex
	var wg sync.WaitGroup

	for uid := range unique {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			prefs, err := h.q.GetUserPreferences(ctx, id)
			if err != nil {
				h.logger.ErrorContext(ctx, "resolve_user_preferences_failed",
					slog.String("component", "coaching"),
					slog.String("user_id", id),
					slog.Any("err", err),
				)
				mu.Lock()
				if firstErr == nil {
					firstErr = fmt.Errorf("resolve user preferences %s: %w", id, err)
				}
				mu.Unlock()
				return
			}
			if _, err := preferences.RequireDisplayName(prefs); err != nil {
				h.logger.ErrorContext(ctx, "resolve_user_display_name_missing",
					slog.String("component", "coaching"),
					slog.String("user_id", id),
					slog.Any("err", err),
				)
				mu.Lock()
				if firstErr == nil {
					firstErr = fmt.Errorf("resolve user display name %s: %w", id, err)
				}
				mu.Unlock()
				return
			}
			mu.Lock()
			result[id] = userInfo{
				ID:       id,
				Username: prefs.Username,
				Avatar:   prefs.Avatar,
			}
			mu.Unlock()
		}(uid)
	}
	wg.Wait()
	if firstErr != nil {
		return nil, firstErr
	}
	return result, nil
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
