// Package push delivers Expo push notifications to registered mobile devices.
// It is intentionally self-contained: it does NOT import internal/notifications
// to avoid a circular dependency (notifications will import push in A4).
// The notification type constants below mirror internal/notifications.Type —
// keep in sync when adding or renaming types there.
package push

import (
	"encoding/json"
	"fmt"
)

// Mirrored notification type constants.
// mirrors internal/notifications.Type — keep in sync.
const (
	typeGroupInvitationReceived = "group_invitation_received"
	typeGroupMemberJoined       = "group_member_joined"
	typeVideoReviewed           = "video_reviewed"
	typeVideoUploaded           = "video_uploaded"
	typeCoachingBookingCreated  = "coaching_booking_created"
)

// Local payload shapes mirror the structs in internal/notifications/types.go.
// They are defined here to break the import cycle: push must not import
// notifications; notifications will import push.

type groupInvitationReceivedPayload struct {
	GroupID     string `json:"group_id,omitempty"`
	GroupName   string `json:"group_name"`
	InviterName string `json:"inviter_name,omitempty"`
	Code        string `json:"code,omitempty"`
}

type groupMemberJoinedPayload struct {
	GroupID    string `json:"group_id"`
	GroupName  string `json:"group_name"`
	MemberName string `json:"member_name"`
}

type videoReviewedPayload struct {
	AssetID      string `json:"asset_id"`
	VideoTitle   string `json:"video_title"`
	GroupName    string `json:"group_name,omitempty"`
	ReviewerName string `json:"reviewer_name,omitempty"`
}

type videoUploadedPayload struct {
	AssetID      string `json:"asset_id"`
	VideoTitle   string `json:"video_title"`
	GroupID      string `json:"group_id,omitempty"`
	GroupName    string `json:"group_name,omitempty"`
	UploaderName string `json:"uploader_name"`
}

type coachingBookingCreatedPayload struct {
	BookingID   string `json:"booking_id"`
	GroupID     string `json:"group_id,omitempty"`
	GroupName   string `json:"group_name,omitempty"`
	StudentName string `json:"student_name"`
	SessionName string `json:"session_name,omitempty"`
	ScheduledAt string `json:"scheduled_at,omitempty"` // RFC3339
}

// BuildMessage translates a notification type and its JSON payload into the
// OS-level push strings (title, body) and a data map for deep-linking.
//
// The data map always includes "type" plus the primary deep-link ID for that
// notification type (asset_id, group_id, booking_id, or code). Unknown types
// return ok=false so the caller can skip them without logging an error.
//
// Note: localization by recipient language is a documented follow-up;
// messages are currently English-only.
func BuildMessage(notificationType string, payload []byte) (title, body string, data map[string]string, ok bool) {
	data = map[string]string{"type": notificationType}

	switch notificationType {
	case typeGroupInvitationReceived:
		var p groupInvitationReceivedPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return "", "", nil, false
		}
		title = "You've been invited!"
		if p.InviterName != "" {
			body = fmt.Sprintf("%s invited you to join %s", p.InviterName, p.GroupName)
		} else {
			body = fmt.Sprintf("You have been invited to join %s", p.GroupName)
		}
		if p.GroupID != "" {
			data["group_id"] = p.GroupID
		}
		if p.Code != "" {
			data["code"] = p.Code
		}

	case typeGroupMemberJoined:
		var p groupMemberJoinedPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return "", "", nil, false
		}
		title = "New member joined"
		body = fmt.Sprintf("%s joined %s", p.MemberName, p.GroupName)
		data["group_id"] = p.GroupID

	case typeVideoReviewed:
		var p videoReviewedPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return "", "", nil, false
		}
		title = "Your video was reviewed"
		if p.ReviewerName != "" {
			body = fmt.Sprintf("%s reviewed \"%s\"", p.ReviewerName, p.VideoTitle)
		} else {
			body = fmt.Sprintf("\"%s\" has been reviewed", p.VideoTitle)
		}
		data["asset_id"] = p.AssetID

	case typeVideoUploaded:
		var p videoUploadedPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return "", "", nil, false
		}
		title = "New video uploaded"
		if p.GroupName != "" {
			body = fmt.Sprintf("%s uploaded \"%s\" to %s", p.UploaderName, p.VideoTitle, p.GroupName)
		} else {
			body = fmt.Sprintf("%s uploaded \"%s\"", p.UploaderName, p.VideoTitle)
		}
		data["asset_id"] = p.AssetID
		if p.GroupID != "" {
			data["group_id"] = p.GroupID
		}

	case typeCoachingBookingCreated:
		var p coachingBookingCreatedPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return "", "", nil, false
		}
		title = "New coaching session booked"
		if p.SessionName != "" {
			body = fmt.Sprintf("%s booked \"%s\"", p.StudentName, p.SessionName)
		} else {
			body = fmt.Sprintf("%s booked a coaching session", p.StudentName)
		}
		data["booking_id"] = p.BookingID
		if p.GroupID != "" {
			data["group_id"] = p.GroupID
		}

	default:
		return "", "", nil, false
	}

	return title, body, data, true
}
