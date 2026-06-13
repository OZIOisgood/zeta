package preferences

import (
	"context"
	"errors"
	"log/slog"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5"
)

// AllowsUserPush returns true when the user has both the master push switch and
// the category-specific push switch enabled. It mirrors AllowsUserEmail exactly
// but reads GetUserPushPreferences.
//
// CoachingReminders has no push column (push reminders are out of scope), so
// AllowsUserPush always returns false for that category.
//
// Fallback behaviour on missing prefs row:
//   - pgx.ErrNoRows → ERROR log, return false (invariant: prefs row must exist).
//   - other DB error  → WARN log, return true (fail-open, same as email).
func AllowsUserPush(ctx context.Context, q db.Querier, log *slog.Logger, userID string, category EmailCategory) bool {
	prefs, err := q.GetUserPushPreferences(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		log.ErrorContext(ctx, "push_preferences_missing",
			slog.String("component", "push_preferences"),
			slog.String("user_id", userID),
			slog.String("category", string(category)),
			slog.Any("err", err),
		)
		return false
	}
	if err != nil {
		log.WarnContext(ctx, "push_preferences_fetch_failed",
			slog.String("component", "push_preferences"),
			slog.String("user_id", userID),
			slog.String("category", string(category)),
			slog.Any("err", err),
		)
		return true
	}

	return AllowsPush(prefs, category)
}

// AllowsPush evaluates a pre-fetched GetUserPushPreferencesRow against the
// given category. CoachingReminders returns false (no push column).
func AllowsPush(prefs db.GetUserPushPreferencesRow, category EmailCategory) bool {
	if !prefs.PushNotificationsEnabled {
		return false
	}

	switch category {
	case EmailCategoryAssetUploads:
		return prefs.PushAssetUploadsEnabled
	case EmailCategoryAssetReviews:
		return prefs.PushAssetReviewsEnabled
	case EmailCategoryInvitationUpdates:
		return prefs.PushInvitationUpdatesEnabled
	case EmailCategoryGroupMembershipUpdates:
		return prefs.PushGroupMembershipUpdatesEnabled
	case EmailCategoryCoachingBookingUpdates:
		return prefs.PushCoachingBookingUpdatesEnabled
	case EmailCategoryCoachingReminders:
		// Push reminders are out of scope — always deny.
		return false
	default:
		return true
	}
}
