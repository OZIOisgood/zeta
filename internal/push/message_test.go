package push

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func mustMarshal(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func TestBuildMessage(t *testing.T) {
	tests := []struct {
		name             string
		notificationType string
		payload          []byte
		wantOk           bool
		wantTitleNonEmpty bool
		wantBodyNonEmpty  bool
		checkData        func(t *testing.T, data map[string]string)
	}{
		{
			name:             "group_invitation_received with inviter and code",
			notificationType: typeGroupInvitationReceived,
			payload: mustMarshal(groupInvitationReceivedPayload{
				GroupID:     "grp-1",
				GroupName:   "Elite Swimmers",
				InviterName: "Coach Bob",
				Code:        "INV-XYZ",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, typeGroupInvitationReceived, data["type"])
				assert.Equal(t, "grp-1", data["group_id"])
				assert.Equal(t, "INV-XYZ", data["code"])
			},
		},
		{
			name:             "group_invitation_received without optional fields",
			notificationType: typeGroupInvitationReceived,
			payload: mustMarshal(groupInvitationReceivedPayload{
				GroupName: "Rookies",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, typeGroupInvitationReceived, data["type"])
				_, hasGroupID := data["group_id"]
				assert.False(t, hasGroupID, "group_id should be absent when empty")
				_, hasCode := data["code"]
				assert.False(t, hasCode, "code should be absent when empty")
			},
		},
		{
			name:             "group_member_joined",
			notificationType: typeGroupMemberJoined,
			payload: mustMarshal(groupMemberJoinedPayload{
				GroupID:    "grp-2",
				GroupName:  "Advanced Runners",
				MemberName: "Alice",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, typeGroupMemberJoined, data["type"])
				assert.Equal(t, "grp-2", data["group_id"])
			},
		},
		{
			name:             "video_reviewed with reviewer name",
			notificationType: typeVideoReviewed,
			payload: mustMarshal(videoReviewedPayload{
				AssetID:      "asset-1",
				VideoTitle:   "My Backstroke",
				GroupName:    "Swim Team",
				ReviewerName: "Coach Jane",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, typeVideoReviewed, data["type"])
				assert.Equal(t, "asset-1", data["asset_id"])
			},
		},
		{
			name:             "video_reviewed without reviewer name",
			notificationType: typeVideoReviewed,
			payload: mustMarshal(videoReviewedPayload{
				AssetID:    "asset-2",
				VideoTitle: "Sprint Drill",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, "asset-2", data["asset_id"])
			},
		},
		{
			name:             "video_uploaded with group",
			notificationType: typeVideoUploaded,
			payload: mustMarshal(videoUploadedPayload{
				AssetID:      "asset-3",
				VideoTitle:   "Flip Turn Practice",
				GroupID:      "grp-3",
				GroupName:    "Masters",
				UploaderName: "Bob",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, typeVideoUploaded, data["type"])
				assert.Equal(t, "asset-3", data["asset_id"])
				assert.Equal(t, "grp-3", data["group_id"])
			},
		},
		{
			name:             "video_uploaded without group",
			notificationType: typeVideoUploaded,
			payload: mustMarshal(videoUploadedPayload{
				AssetID:      "asset-4",
				VideoTitle:   "Solo Drill",
				UploaderName: "Carol",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, "asset-4", data["asset_id"])
				_, hasGroupID := data["group_id"]
				assert.False(t, hasGroupID, "group_id should be absent when empty")
			},
		},
		{
			name:             "coaching_booking_created with session name",
			notificationType: typeCoachingBookingCreated,
			payload: mustMarshal(coachingBookingCreatedPayload{
				BookingID:   "book-1",
				GroupID:     "grp-4",
				GroupName:   "Pro Coaching",
				StudentName: "Dave",
				SessionName: "60-min Technique",
				ScheduledAt: "2026-06-14T10:00:00Z",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, typeCoachingBookingCreated, data["type"])
				assert.Equal(t, "book-1", data["booking_id"])
				assert.Equal(t, "grp-4", data["group_id"])
			},
		},
		{
			name:             "coaching_booking_created without session name",
			notificationType: typeCoachingBookingCreated,
			payload: mustMarshal(coachingBookingCreatedPayload{
				BookingID:   "book-2",
				StudentName: "Eve",
			}),
			wantOk:            true,
			wantTitleNonEmpty: true,
			wantBodyNonEmpty:  true,
			checkData: func(t *testing.T, data map[string]string) {
				t.Helper()
				assert.Equal(t, "book-2", data["booking_id"])
				_, hasGroupID := data["group_id"]
				assert.False(t, hasGroupID, "group_id should be absent when empty")
			},
		},
		{
			name:             "unknown type returns ok=false",
			notificationType: "not_a_real_type",
			payload:          []byte(`{}`),
			wantOk:           false,
		},
		{
			name:             "malformed JSON returns ok=false",
			notificationType: typeVideoReviewed,
			payload:          []byte(`{invalid json`),
			wantOk:           false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			title, body, data, ok := BuildMessage(tt.notificationType, tt.payload)

			require.Equal(t, tt.wantOk, ok)
			if !tt.wantOk {
				return
			}

			if tt.wantTitleNonEmpty {
				assert.NotEmpty(t, title, "title should be non-empty")
			}
			if tt.wantBodyNonEmpty {
				assert.NotEmpty(t, body, "body should be non-empty")
			}
			if tt.checkData != nil {
				tt.checkData(t, data)
			}
		})
	}
}
