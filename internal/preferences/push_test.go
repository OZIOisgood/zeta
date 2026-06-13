package preferences

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// fullOnPushPrefs returns a row with every push switch enabled.
func fullOnPushPrefs() db.GetUserPushPreferencesRow {
	return db.GetUserPushPreferencesRow{
		PushNotificationsEnabled:          true,
		PushAssetUploadsEnabled:           true,
		PushAssetReviewsEnabled:           true,
		PushInvitationUpdatesEnabled:      true,
		PushGroupMembershipUpdatesEnabled: true,
		PushCoachingBookingUpdatesEnabled: true,
	}
}

// --- AllowsPush unit tests (no DB, synchronous) ---

func TestAllowsPush_MasterOff_BlocksAll(t *testing.T) {
	prefs := fullOnPushPrefs()
	prefs.PushNotificationsEnabled = false

	categories := []EmailCategory{
		EmailCategoryAssetUploads,
		EmailCategoryAssetReviews,
		EmailCategoryInvitationUpdates,
		EmailCategoryGroupMembershipUpdates,
		EmailCategoryCoachingBookingUpdates,
		EmailCategoryCoachingReminders,
	}
	for _, cat := range categories {
		assert.False(t, AllowsPush(prefs, cat), "master off should block %s", cat)
	}
}

func TestAllowsPush_CoachingReminders_AlwaysFalse(t *testing.T) {
	prefs := fullOnPushPrefs()
	// Even with everything else enabled, CoachingReminders has no push column.
	assert.False(t, AllowsPush(prefs, EmailCategoryCoachingReminders))
}

func TestAllowsPush_CategorySwitches(t *testing.T) {
	tt := []struct {
		name     string
		category EmailCategory
		field    func(*db.GetUserPushPreferencesRow, bool)
	}{
		{
			name:     "asset_uploads",
			category: EmailCategoryAssetUploads,
			field:    func(p *db.GetUserPushPreferencesRow, v bool) { p.PushAssetUploadsEnabled = v },
		},
		{
			name:     "asset_reviews",
			category: EmailCategoryAssetReviews,
			field:    func(p *db.GetUserPushPreferencesRow, v bool) { p.PushAssetReviewsEnabled = v },
		},
		{
			name:     "invitation_updates",
			category: EmailCategoryInvitationUpdates,
			field:    func(p *db.GetUserPushPreferencesRow, v bool) { p.PushInvitationUpdatesEnabled = v },
		},
		{
			name:     "group_membership_updates",
			category: EmailCategoryGroupMembershipUpdates,
			field:    func(p *db.GetUserPushPreferencesRow, v bool) { p.PushGroupMembershipUpdatesEnabled = v },
		},
		{
			name:     "coaching_booking_updates",
			category: EmailCategoryCoachingBookingUpdates,
			field:    func(p *db.GetUserPushPreferencesRow, v bool) { p.PushCoachingBookingUpdatesEnabled = v },
		},
	}

	for _, tc := range tt {
		t.Run(tc.name+"_on", func(t *testing.T) {
			prefs := fullOnPushPrefs()
			tc.field(&prefs, true)
			assert.True(t, AllowsPush(prefs, tc.category))
		})
		t.Run(tc.name+"_off", func(t *testing.T) {
			prefs := fullOnPushPrefs()
			tc.field(&prefs, false)
			assert.False(t, AllowsPush(prefs, tc.category))
		})
	}
}

// --- AllowsUserPush integration tests (mock DB) ---

func TestAllowsUserPush_NoRows_ReturnsFalse(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(db.GetUserPushPreferencesRow{}, pgx.ErrNoRows)

	result := AllowsUserPush(context.Background(), q, discardLogger(), "user-1", EmailCategoryAssetUploads)
	assert.False(t, result, "missing prefs row should return false")
}

func TestAllowsUserPush_OtherDBError_ReturnsTrue(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(db.GetUserPushPreferencesRow{}, errors.New("connection reset"))

	result := AllowsUserPush(context.Background(), q, discardLogger(), "user-1", EmailCategoryAssetUploads)
	assert.True(t, result, "transient DB error should fail-open (return true)")
}

func TestAllowsUserPush_MasterOff_ReturnsFalse(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	prefs := fullOnPushPrefs()
	prefs.PushNotificationsEnabled = false
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(prefs, nil)

	result := AllowsUserPush(context.Background(), q, discardLogger(), "user-1", EmailCategoryAssetUploads)
	assert.False(t, result, "master off should return false")
}

func TestAllowsUserPush_CategoryOff_ReturnsFalse(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	prefs := fullOnPushPrefs()
	prefs.PushAssetReviewsEnabled = false
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(prefs, nil)

	result := AllowsUserPush(context.Background(), q, discardLogger(), "user-1", EmailCategoryAssetReviews)
	assert.False(t, result, "category off should return false")
}

func TestAllowsUserPush_AllOn_ReturnsTrue(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(fullOnPushPrefs(), nil)

	result := AllowsUserPush(context.Background(), q, discardLogger(), "user-1", EmailCategoryAssetUploads)
	assert.True(t, result)
}
