package notifications

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// fakeNotifier is a simple test double that records Notify calls.
type fakeNotifier struct {
	calls []notifyCall
}

type notifyCall struct {
	recipientID      string
	notificationType string
	payload          []byte
}

func (f *fakeNotifier) Notify(_ context.Context, recipientID string, notificationType string, payload []byte) {
	f.calls = append(f.calls, notifyCall{recipientID, notificationType, payload})
}

func discardLog() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// stubUUID returns a non-zero pgtype.UUID for CreateNotification return values.
func stubUUID(t *testing.T) pgtype.UUID {
	t.Helper()
	var id pgtype.UUID
	require.NoError(t, id.Scan("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"))
	return id
}

// stubNotification returns a minimal Notification to satisfy the CreateNotification return.
func stubNotification(t *testing.T) db.Notification {
	return db.Notification{ID: stubUUID(t)}
}

// fullOnPushPrefs returns a GetUserPushPreferencesRow with all switches enabled.
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

// withNotifier sets the package-level notifier for the duration of a test and
// resets it to nil afterwards. Tests that test the nil case skip calling this.
func withNotifier(t *testing.T, n Notifier) {
	t.Helper()
	SetNotifier(n)
	t.Cleanup(func() { SetNotifier(nil) })
}

// --- Tests ---

func TestRecord_NotifierNil_RowInserted_PushNotCalled(t *testing.T) {
	// Ensure global notifier is nil for this test.
	SetNotifier(nil)
	t.Cleanup(func() { SetNotifier(nil) })

	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)

	payload := VideoUploadedPayload{AssetID: "a1", VideoTitle: "Clip", UploaderName: "Alice"}
	q.EXPECT().
		CreateNotification(gomock.Any(), gomock.Any()).
		Return(stubNotification(t), nil)
	// GetUserPushPreferences must NOT be called when notifier is nil.

	Record(context.Background(), q, discardLog(), "user-1", TypeVideoUploaded, payload)
}

func TestRecord_AllowedPush_NotifyCalled(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	fake := &fakeNotifier{}
	withNotifier(t, fake)

	payload := VideoUploadedPayload{AssetID: "a1", VideoTitle: "Clip", UploaderName: "Alice"}
	q.EXPECT().
		CreateNotification(gomock.Any(), gomock.Any()).
		Return(stubNotification(t), nil)
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(fullOnPushPrefs(), nil)

	Record(context.Background(), q, discardLog(), "user-1", TypeVideoUploaded, payload)

	require.Len(t, fake.calls, 1)
	assert.Equal(t, "user-1", fake.calls[0].recipientID)
	assert.Equal(t, string(TypeVideoUploaded), fake.calls[0].notificationType)
	assert.NotEmpty(t, fake.calls[0].payload)
}

func TestRecord_MasterPushOff_NotifyNotCalled(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	fake := &fakeNotifier{}
	withNotifier(t, fake)

	prefs := fullOnPushPrefs()
	prefs.PushNotificationsEnabled = false

	payload := VideoUploadedPayload{AssetID: "a1", VideoTitle: "Clip", UploaderName: "Alice"}
	q.EXPECT().
		CreateNotification(gomock.Any(), gomock.Any()).
		Return(stubNotification(t), nil)
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(prefs, nil)

	Record(context.Background(), q, discardLog(), "user-1", TypeVideoUploaded, payload)

	assert.Empty(t, fake.calls, "master push disabled should suppress push")
}

func TestRecord_CategoryPushOff_NotifyNotCalled(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	fake := &fakeNotifier{}
	withNotifier(t, fake)

	prefs := fullOnPushPrefs()
	prefs.PushAssetUploadsEnabled = false

	payload := VideoUploadedPayload{AssetID: "a1", VideoTitle: "Clip", UploaderName: "Alice"}
	q.EXPECT().
		CreateNotification(gomock.Any(), gomock.Any()).
		Return(stubNotification(t), nil)
	q.EXPECT().
		GetUserPushPreferences(gomock.Any(), "user-1").
		Return(prefs, nil)

	Record(context.Background(), q, discardLog(), "user-1", TypeVideoUploaded, payload)

	assert.Empty(t, fake.calls, "category push disabled should suppress push")
}

func TestRecord_PayloadMarshalFailure_NeitherRowNorPush(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	fake := &fakeNotifier{}
	withNotifier(t, fake)

	// json.Marshal cannot marshal a channel.
	badPayload := make(chan int)

	// Neither CreateNotification nor GetUserPushPreferences should be called.
	Record(context.Background(), q, discardLog(), "user-1", TypeVideoUploaded, badPayload)

	assert.Empty(t, fake.calls)
}

func TestRecord_InsertFailure_PushNotCalled(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	fake := &fakeNotifier{}
	withNotifier(t, fake)

	payload := VideoUploadedPayload{AssetID: "a1", VideoTitle: "Clip", UploaderName: "Alice"}
	q.EXPECT().
		CreateNotification(gomock.Any(), gomock.Any()).
		Return(db.Notification{}, errors.New("db error"))
	// GetUserPushPreferences must NOT be called on insert failure.

	Record(context.Background(), q, discardLog(), "user-1", TypeVideoUploaded, payload)

	assert.Empty(t, fake.calls, "insert failure should prevent push delivery")
}

func TestRecord_EmptyRecipient_NoOp(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	fake := &fakeNotifier{}
	withNotifier(t, fake)

	// No DB calls should happen for an empty recipientID.
	Record(context.Background(), q, discardLog(), "", TypeVideoUploaded, VideoUploadedPayload{})

	assert.Empty(t, fake.calls)
}

// TestRecord_AllTypes verifies that every notification Type that has a push
// category triggers Notify (all prefs on), and the payload bytes are forwarded.
func TestRecord_AllTypes_PushDelivered(t *testing.T) {
	type testCase struct {
		t       Type
		payload any
	}
	cases := []testCase{
		{TypeVideoUploaded, VideoUploadedPayload{AssetID: "a", VideoTitle: "T", UploaderName: "U"}},
		{TypeVideoReviewed, VideoReviewedPayload{AssetID: "a", VideoTitle: "T"}},
		{TypeGroupInvitationReceived, GroupInvitationReceivedPayload{GroupName: "G"}},
		{TypeGroupMemberJoined, GroupMemberJoinedPayload{GroupID: "g", GroupName: "G", MemberName: "M"}},
		{TypeCoachingBookingCreated, CoachingBookingCreatedPayload{BookingID: "b", StudentName: "S"}},
	}

	for _, tc := range cases {
		t.Run(string(tc.t), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			q := dbmocks.NewMockQuerier(ctrl)
			fake := &fakeNotifier{}
			withNotifier(t, fake)

			q.EXPECT().CreateNotification(gomock.Any(), gomock.Any()).Return(stubNotification(t), nil)
			q.EXPECT().GetUserPushPreferences(gomock.Any(), "user-1").Return(fullOnPushPrefs(), nil)

			Record(context.Background(), q, discardLog(), "user-1", tc.t, tc.payload)

			require.Len(t, fake.calls, 1)
			assert.Equal(t, string(tc.t), fake.calls[0].notificationType)
		})
	}
}

// TestPushCategory ensures the mapping is complete and correct.
func TestPushCategory(t *testing.T) {
	tt := []struct {
		typ  Type
		want string
		ok   bool
	}{
		{TypeVideoUploaded, "asset_uploads", true},
		{TypeVideoReviewed, "asset_reviews", true},
		{TypeGroupInvitationReceived, "invitation_updates", true},
		{TypeGroupMemberJoined, "group_membership_updates", true},
		{TypeCoachingBookingCreated, "coaching_booking_updates", true},
		{"unknown_type", "", false},
	}
	for _, tc := range tt {
		t.Run(string(tc.typ), func(t *testing.T) {
			cat, ok := pushCategory(tc.typ)
			assert.Equal(t, tc.ok, ok)
			if ok {
				assert.Equal(t, tc.want, string(cat))
			}
		})
	}
}
