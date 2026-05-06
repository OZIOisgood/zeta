package preferences

import (
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
)

func TestAllowsHonorsMasterSwitch(t *testing.T) {
	prefs := db.GetUserEmailPreferencesRow{
		EmailNotificationsEnabled:          false,
		EmailAssetUploadsEnabled:           true,
		EmailAssetReviewsEnabled:           true,
		EmailInvitationUpdatesEnabled:      true,
		EmailGroupMembershipUpdatesEnabled: true,
		EmailCoachingBookingUpdatesEnabled: true,
		EmailCoachingRemindersEnabled:      true,
	}

	if Allows(prefs, EmailCategoryAssetUploads) {
		t.Fatal("expected master disabled preference to block asset upload email")
	}
}

func TestAllowsHonorsCategorySwitch(t *testing.T) {
	prefs := db.GetUserEmailPreferencesRow{
		EmailNotificationsEnabled:          true,
		EmailAssetUploadsEnabled:           true,
		EmailAssetReviewsEnabled:           false,
		EmailInvitationUpdatesEnabled:      true,
		EmailGroupMembershipUpdatesEnabled: true,
		EmailCoachingBookingUpdatesEnabled: true,
		EmailCoachingRemindersEnabled:      true,
	}

	if Allows(prefs, EmailCategoryAssetReviews) {
		t.Fatal("expected disabled asset review preference to block asset review email")
	}
	if !Allows(prefs, EmailCategoryAssetUploads) {
		t.Fatal("expected enabled asset upload preference to allow asset upload email")
	}
}
