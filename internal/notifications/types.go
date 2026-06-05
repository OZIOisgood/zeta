// Package notifications persists and delivers in-app notifications. Rows are
// written at event time (see Record) and streamed to connected clients over SSE
// via Hub + Listener. The Postgres trigger on the notifications table emits a
// NOTIFY that the Listener fans out, so writers stay decoupled from delivery.
package notifications

// Type mirrors the notification_type Postgres enum. Keep in sync with the
// migration and db.NotificationType.
type Type string

const (
	TypeGroupInvitationReceived Type = "group_invitation_received"
	TypeGroupMemberJoined       Type = "group_member_joined"
	TypeVideoReviewed           Type = "video_reviewed"
	TypeVideoUploaded           Type = "video_uploaded"
	TypeCoachingBookingCreated  Type = "coaching_booking_created"
)

// Payloads are denormalized so the client can render text and build a deep-link
// without extra lookups, and stay readable even if the source row is later
// deleted. omitempty keeps stored JSON lean.

type GroupInvitationReceivedPayload struct {
	GroupID     string `json:"group_id,omitempty"`
	GroupName   string `json:"group_name"`
	InviterName string `json:"inviter_name,omitempty"`
	Code        string `json:"code,omitempty"`
}

type GroupMemberJoinedPayload struct {
	GroupID    string `json:"group_id"`
	GroupName  string `json:"group_name"`
	MemberName string `json:"member_name"`
}

type VideoReviewedPayload struct {
	AssetID      string `json:"asset_id"`
	VideoTitle   string `json:"video_title"`
	GroupName    string `json:"group_name,omitempty"`
	ReviewerName string `json:"reviewer_name,omitempty"`
}

type VideoUploadedPayload struct {
	AssetID      string `json:"asset_id"`
	VideoTitle   string `json:"video_title"`
	GroupID      string `json:"group_id,omitempty"`
	GroupName    string `json:"group_name,omitempty"`
	UploaderName string `json:"uploader_name"`
}

type CoachingBookingCreatedPayload struct {
	BookingID   string `json:"booking_id"`
	GroupID     string `json:"group_id,omitempty"`
	GroupName   string `json:"group_name,omitempty"`
	StudentName string `json:"student_name"`
	SessionName string `json:"session_name,omitempty"`
	ScheduledAt string `json:"scheduled_at,omitempty"` // RFC3339
}
