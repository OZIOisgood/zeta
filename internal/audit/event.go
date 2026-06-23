// Package audit records an append-only trail of who did what, when. Events are
// written in the same transaction as the mutation they describe.
package audit

// Resource types — the kind of entity an event is about.
const (
	ResourceBooking         = "booking"
	ResourceCoachingSession = "coaching_session"
	ResourceRecording       = "recording"
	ResourceReview          = "review"
	ResourceGroup           = "group"
	ResourceGroupMembership = "group_membership"
	ResourceGroupInvite     = "group_invite"
	ResourceAsset           = "asset"
	ResourceVideo           = "video"
	ResourceProfile         = "profile"
	ResourceUserRole        = "user_role"
	ResourceAdminExpertCode = "admin_expert_code"
)

// Actions — stable verbs. These names are part of the trail's contract; never
// rename an existing one (downstream queries and exports depend on them).
const (
	ActionBookingCreated     = "booking.created"
	ActionBookingCancelled   = "booking.cancelled"
	ActionBookingRescheduled = "booking.rescheduled"

	ActionCoachingSessionConducted = "coaching_session.conducted"

	ActionRecordingCreated = "recording.created"
	ActionRecordingDeleted = "recording.deleted"

	ActionReviewCreated = "review.created"
	ActionReviewUpdated = "review.updated"
	ActionReviewDeleted = "review.deleted"

	ActionGroupCreated = "group.created"
	ActionGroupUpdated = "group.updated"
	ActionGroupDeleted = "group.deleted"

	ActionGroupMembershipAdded   = "group_membership.added"
	ActionGroupMembershipRemoved = "group_membership.removed"
	ActionGroupMembershipLeft    = "group_membership.left"

	ActionGroupInviteCreated  = "group_invite.created"
	ActionGroupInviteAccepted = "group_invite.accepted"
	ActionGroupInviteRevoked  = "group_invite.revoked"

	ActionAssetDeleted = "asset.deleted"
	ActionVideoDeleted = "video.deleted"

	ActionProfileUpdated = "profile.updated"

	ActionUserRoleUpdated       = "user.role_updated"
	ActionAdminExpertCodeCreated = "admin_expert_code.created"
	ActionAdminExpertCodeRevoked = "admin_expert_code.revoked"
	ActionAdminExpertCodeRedeemed = "admin_expert_code.redeemed"
)

// Event describes a single audited mutation. ResourceID and GroupID are empty
// strings when not applicable (stored as SQL NULL).
//
// OldValues/NewValues MUST be a *curated snapshot DTO*, never a raw db row.
// Marshalling a db.* struct directly couples the audit format to DB migrations
// and leaks unfiltered PII. Each snapshot type carries a `_v` schema version
// (start at 1; bump only on breaking shape changes) and includes only the fields
// you intentionally want in the trail (no tokens, no full profiles, no email
// bodies). See the design spec, "Schema-Evolution der Snapshots".
type Event struct {
	Action       string
	ResourceType string
	ResourceID   string
	GroupID      string
	OldValues    any
	NewValues    any
}
