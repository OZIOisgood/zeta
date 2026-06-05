package notifications

import (
	"encoding/json"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/pgutil"
)

// item is the wire shape returned by the list endpoint and pushed over SSE.
// Payload is forwarded as raw JSON so the client receives a nested object
// (not an escaped string) and renders/links per type.
type item struct {
	ID      string          `json:"id"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
	Read    bool            `json:"read"`
	// InviteStatus carries the current status of the referenced invitation
	// (pending/accepted/declined/expired) for group_invitation_received items, so
	// the client can hide accept/decline once it is no longer actionable. Empty
	// for all other types and for live SSE pushes (treated as still actionable).
	InviteStatus string    `json:"invite_status,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

func toItem(n db.Notification) item {
	payload := json.RawMessage(n.Payload)
	if len(payload) == 0 {
		payload = json.RawMessage(`{}`)
	}
	var createdAt time.Time
	if n.CreatedAt.Valid {
		createdAt = n.CreatedAt.Time
	}
	return item{
		ID:        pgutil.UUIDToString(n.ID),
		Type:      string(n.Type),
		Payload:   payload,
		Read:      n.ReadAt.Valid,
		CreatedAt: createdAt,
	}
}
