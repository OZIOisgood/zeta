package notifications

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const pgNotifyChannel = "notifications"

// Listener holds a dedicated Postgres connection that LISTENs for notification
// inserts (emitted by the DB trigger) and fans them out through the Hub to
// locally connected SSE clients. Run it once per API instance. Using
// LISTEN/NOTIFY keeps delivery correct across multiple instances without any
// extra infrastructure.
type Listener struct {
	pool   *pgxpool.Pool
	q      db.Querier
	hub    *Hub
	logger *slog.Logger
}

func NewListener(pool *pgxpool.Pool, q db.Querier, hub *Hub, logger *slog.Logger) *Listener {
	return &Listener{pool: pool, q: q, hub: hub, logger: logger}
}

type notifyPayload struct {
	ID          string `json:"id"`
	RecipientID string `json:"recipient_id"`
}

// Run blocks until ctx is cancelled, reconnecting on error with a short backoff.
func (l *Listener) Run(ctx context.Context) {
	for ctx.Err() == nil {
		if err := l.listen(ctx); err != nil && ctx.Err() == nil {
			l.logger.Error("notification_listener_error",
				slog.String("component", "notifications"),
				slog.Any("err", err),
			)
			select {
			case <-ctx.Done():
			case <-time.After(2 * time.Second):
			}
		}
	}
}

func (l *Listener) listen(ctx context.Context) error {
	conn, err := l.pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "LISTEN "+pgNotifyChannel); err != nil {
		return err
	}
	l.logger.Info("notification_listener_started",
		slog.String("component", "notifications"),
	)

	for {
		n, err := conn.Conn().WaitForNotification(ctx)
		if err != nil {
			return err
		}
		l.dispatch(ctx, n.Payload)
	}
}

func (l *Listener) dispatch(ctx context.Context, raw string) {
	var p notifyPayload
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		l.logger.WarnContext(ctx, "notification_notify_decode_failed",
			slog.String("component", "notifications"),
			slog.Any("err", err),
		)
		return
	}

	var id pgtype.UUID
	if err := id.Scan(p.ID); err != nil {
		return
	}

	row, err := l.q.GetNotification(ctx, id)
	if err != nil {
		l.logger.WarnContext(ctx, "notification_notify_fetch_failed",
			slog.String("component", "notifications"),
			slog.String("notification_id", p.ID),
			slog.Any("err", err),
		)
		return
	}

	msg, err := json.Marshal(toItem(row))
	if err != nil {
		return
	}
	l.hub.Publish(p.RecipientID, msg)
}
