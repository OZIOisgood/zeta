package audit

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Recorder writes audit events. It is stateless and safe for concurrent use.
type Recorder struct{}

// NewRecorder constructs a Recorder.
func NewRecorder() *Recorder { return &Recorder{} }

// Record writes one event inside the supplied transaction. The parameter is
// deliberately pgx.Tx — NOT db.DBTX — so the atomicity contract is enforced at
// compile time: the audit row commits or rolls back together with the caller's
// mutation, never independently. The actor is resolved from the context; absent
// a user it is recorded as the system actor.
func (r *Recorder) Record(ctx context.Context, tx pgx.Tx, e Event) error {
	q := db.New(tx)

	actorType := "system"
	var actorID, actorLabel pgtype.Text
	if u := auth.GetUser(ctx); u != nil {
		actorType = "user"
		actorID = text(u.ID)
		label := strings.TrimSpace(u.FirstName + " " + u.LastName)
		if label == "" {
			label = u.Email
		}
		actorLabel = text(label)
	}

	meta := requestMetaFrom(ctx)
	metaMap := map[string]string{}
	for k, v := range map[string]string{
		"request_id": meta.RequestID,
		"ip":         meta.IP,
		"user_agent": meta.UserAgent,
	} {
		if v != "" {
			metaMap[k] = v
		}
	}
	var metaJSON []byte
	if len(metaMap) > 0 {
		b, err := json.Marshal(metaMap)
		if err != nil {
			return err
		}
		metaJSON = b
	}

	oldJSON, err := marshalOrNil(e.OldValues)
	if err != nil {
		return err
	}
	newJSON, err := marshalOrNil(e.NewValues)
	if err != nil {
		return err
	}

	return q.CreateAuditEvent(ctx, db.CreateAuditEventParams{
		ActorID:      actorID,
		ActorType:    actorType,
		ActorLabel:   actorLabel,
		Action:       e.Action,
		ResourceType: e.ResourceType,
		ResourceID:   text(e.ResourceID),
		GroupID:      text(e.GroupID),
		OldValues:    oldJSON,
		NewValues:    newJSON,
		Metadata:     metaJSON,
	})
}

func text(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

func marshalOrNil(v any) ([]byte, error) {
	if v == nil {
		return nil, nil
	}
	return json.Marshal(v)
}
