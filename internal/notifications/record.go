package notifications

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/OZIOisgood/zeta/internal/db"
)

// Record persists an in-app notification for recipientID. It is intended to be
// called from background goroutines at event time (alongside the existing email
// notifications). Failures are logged and swallowed so a notification problem
// never breaks the originating request. The DB trigger handles SSE fan-out.
func Record(ctx context.Context, q db.Querier, log *slog.Logger, recipientID string, t Type, payload any) {
	if recipientID == "" {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		log.WarnContext(ctx, "notification_payload_marshal_failed",
			slog.String("component", "notifications"),
			slog.String("type", string(t)),
			slog.Any("err", err),
		)
		return
	}

	if _, err := q.CreateNotification(ctx, db.CreateNotificationParams{
		RecipientID: recipientID,
		Type:        db.NotificationType(t),
		Payload:     data,
	}); err != nil {
		log.ErrorContext(ctx, "notification_create_failed",
			slog.String("component", "notifications"),
			slog.String("recipient_id", recipientID),
			slog.String("type", string(t)),
			slog.Any("err", err),
		)
		return
	}

	log.InfoContext(ctx, "notification_created",
		slog.String("component", "notifications"),
		slog.String("recipient_id", recipientID),
		slog.String("type", string(t)),
	)
}
