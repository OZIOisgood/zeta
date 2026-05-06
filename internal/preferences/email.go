package preferences

import (
	"context"
	"errors"
	"log/slog"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5"
)

type EmailCategory string

const (
	EmailCategoryAssetUploads           EmailCategory = "asset_uploads"
	EmailCategoryAssetReviews           EmailCategory = "asset_reviews"
	EmailCategoryInvitationUpdates      EmailCategory = "invitation_updates"
	EmailCategoryGroupMembershipUpdates EmailCategory = "group_membership_updates"
	EmailCategoryCoachingBookingUpdates EmailCategory = "coaching_booking_updates"
	EmailCategoryCoachingReminders      EmailCategory = "coaching_reminders"
)

type EmailPreferences struct {
	NotificationsEnabled          bool `json:"notifications_enabled"`
	AssetUploadsEnabled           bool `json:"asset_uploads_enabled"`
	AssetReviewsEnabled           bool `json:"asset_reviews_enabled"`
	InvitationUpdatesEnabled      bool `json:"invitation_updates_enabled"`
	GroupMembershipUpdatesEnabled bool `json:"group_membership_updates_enabled"`
	CoachingBookingUpdatesEnabled bool `json:"coaching_booking_updates_enabled"`
	CoachingRemindersEnabled      bool `json:"coaching_reminders_enabled"`
}

func FromUserPreferences(prefs db.UserPreference) EmailPreferences {
	return EmailPreferences{
		NotificationsEnabled:          prefs.EmailNotificationsEnabled,
		AssetUploadsEnabled:           prefs.EmailAssetUploadsEnabled,
		AssetReviewsEnabled:           prefs.EmailAssetReviewsEnabled,
		InvitationUpdatesEnabled:      prefs.EmailInvitationUpdatesEnabled,
		GroupMembershipUpdatesEnabled: prefs.EmailGroupMembershipUpdatesEnabled,
		CoachingBookingUpdatesEnabled: prefs.EmailCoachingBookingUpdatesEnabled,
		CoachingRemindersEnabled:      prefs.EmailCoachingRemindersEnabled,
	}
}

func ToUpdateParams(userID string, prefs EmailPreferences) db.UpdateUserEmailPreferencesParams {
	return db.UpdateUserEmailPreferencesParams{
		UserID:                             userID,
		EmailNotificationsEnabled:          prefs.NotificationsEnabled,
		EmailAssetUploadsEnabled:           prefs.AssetUploadsEnabled,
		EmailAssetReviewsEnabled:           prefs.AssetReviewsEnabled,
		EmailInvitationUpdatesEnabled:      prefs.InvitationUpdatesEnabled,
		EmailGroupMembershipUpdatesEnabled: prefs.GroupMembershipUpdatesEnabled,
		EmailCoachingBookingUpdatesEnabled: prefs.CoachingBookingUpdatesEnabled,
		EmailCoachingRemindersEnabled:      prefs.CoachingRemindersEnabled,
	}
}

func AllowsUserEmail(ctx context.Context, q db.Querier, log *slog.Logger, userID string, category EmailCategory) bool {
	prefs, err := q.GetUserEmailPreferences(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return true
	}
	if err != nil {
		log.WarnContext(ctx, "email_preferences_fetch_failed",
			slog.String("component", "email_preferences"),
			slog.String("user_id", userID),
			slog.String("category", string(category)),
			slog.Any("err", err),
		)
		return true
	}

	return Allows(prefs, category)
}

func Allows(prefs db.GetUserEmailPreferencesRow, category EmailCategory) bool {
	if !prefs.EmailNotificationsEnabled {
		return false
	}

	switch category {
	case EmailCategoryAssetUploads:
		return prefs.EmailAssetUploadsEnabled
	case EmailCategoryAssetReviews:
		return prefs.EmailAssetReviewsEnabled
	case EmailCategoryInvitationUpdates:
		return prefs.EmailInvitationUpdatesEnabled
	case EmailCategoryGroupMembershipUpdates:
		return prefs.EmailGroupMembershipUpdatesEnabled
	case EmailCategoryCoachingBookingUpdates:
		return prefs.EmailCoachingBookingUpdatesEnabled
	case EmailCategoryCoachingReminders:
		return prefs.EmailCoachingRemindersEnabled
	default:
		return true
	}
}
