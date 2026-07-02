package notifications

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/preferences"
)

// Notifier is a narrow interface satisfied by *push.Sender. It is defined here
// so the notifications package does NOT import internal/push (which would create
// a cycle since push's message.go mirrors notification type constants).
type Notifier interface {
	Notify(ctx context.Context, recipientID string, notificationType string, payload []byte)
}

// notifier is the package-level push delivery backend. nil means push is
// disabled (the default until SetNotifier is called from the composition root).
var notifier Notifier

// SetNotifier registers the push delivery backend. Called once from server
// startup after the Querier and Logger are available.
func SetNotifier(n Notifier) {
	notifier = n
}

// pushCategory maps an in-app notification Type to the EmailCategory that gates
// the corresponding push preference. Returns false for types that have no push
// column (currently none, but the bool guards unknown future types as well).
func pushCategory(t Type) (preferences.EmailCategory, bool) {
	switch t {
	case TypeVideoUploaded:
		return preferences.EmailCategoryAssetUploads, true
	case TypeVideoReviewed:
		return preferences.EmailCategoryAssetReviews, true
	case TypeGroupInvitationReceived:
		return preferences.EmailCategoryInvitationUpdates, true
	case TypeGroupMemberJoined:
		return preferences.EmailCategoryGroupMembershipUpdates, true
	case TypeCoachingBookingCreated:
		return preferences.EmailCategoryCoachingBookingUpdates, true
	default:
		return "", false
	}
}

// Record persists an in-app notification for recipientID. It is intended to be
// called from background goroutines at event time (alongside the existing email
// notifications). Failures are logged and swallowed so a notification problem
// never breaks the originating request. The DB trigger handles SSE fan-out.
//
// After the in-app row is inserted successfully, Record also delivers a push
// notification when a Notifier has been registered and the recipient's push
// preferences allow it for the given notification type. The in-app insert is
// unconditional — push gating never suppresses the row.
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

	// Push delivery — only when a Notifier has been wired and the notification
	// type maps to a push preference category.
	if notifier == nil {
		return
	}
	cat, ok := pushCategory(t)
	if !ok {
		return
	}
	if preferences.AllowsUserPush(ctx, q, log, recipientID, cat) {
		notifier.Notify(ctx, recipientID, string(t), data)
	}
}
