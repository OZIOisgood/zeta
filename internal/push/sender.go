package push

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
)

const expoAPIURL = "https://exp.host/--/api/v2/push/send"

// httpDoer is a narrow interface over *http.Client so tests can inject a mock.
type httpDoer interface {
	Do(*http.Request) (*http.Response, error)
}

// Sender delivers Expo push notifications to registered devices. It is safe
// for concurrent use. Notify has fire-and-forget semantics: all errors are
// logged and swallowed so callers (e.g. the notifications pipeline) are never
// blocked or errored by push delivery failures.
//
// Preference gating (whether a user has push enabled) is the caller's
// responsibility — Sender sends to every registered device unconditionally.
//
// DeleteDeviceByToken is intentionally unscoped to any user ID: the Expo API
// reports invalid tokens positionally in the ticket response, and by the time
// we prune we only know the token, not which user it belonged to. This is
// server-side housekeeping, not a user-visible delete, so no user scope is
// required or appropriate.
type Sender struct {
	q           db.Querier
	http        httpDoer
	accessToken string
	log         *slog.Logger
}

// NewSender creates a Sender. The Expo access token is read from the
// EXPO_ACCESS_TOKEN environment variable; if absent, the Authorization header
// is omitted (development / open-sandbox tokens still work without it).
func NewSender(q db.Querier, log *slog.Logger) *Sender {
	return &Sender{
		q:           q,
		http:        &http.Client{Timeout: 10 * time.Second},
		accessToken: os.Getenv("EXPO_ACCESS_TOKEN"),
		log:         log,
	}
}

// expoMessage is one entry in the Expo push API request body.
type expoMessage struct {
	To    string            `json:"to"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
}

// expoTicket is one entry in the Expo push API response body.
type expoTicket struct {
	Status  string `json:"status"`
	Details struct {
		Error string `json:"error"`
	} `json:"details"`
}

type expoResponse struct {
	Data []expoTicket `json:"data"`
}

// tokenPrefix returns the first 32 characters of an Expo push token for safe
// logging — enough to correlate device logs without exposing the full token.
func tokenPrefix(token string) string {
	if len(token) <= 32 {
		return token
	}
	return token[:32] + "..."
}

// Notify looks up all registered devices for recipientID, builds the Expo
// push message from the notification type and payload, and POSTs to the Expo
// push API. Any token reported as DeviceNotRegistered is pruned from the DB.
//
// Notify never returns an error; all failures are logged at WARN level.
func (s *Sender) Notify(ctx context.Context, recipientID string, notificationType string, payload []byte) {
	log := logger.From(ctx, s.log)

	devices, err := s.q.ListDevicesForUser(ctx, recipientID)
	if err != nil {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "list_devices_failed"),
			slog.Any("err", err),
		)
		return
	}
	if len(devices) == 0 {
		return
	}

	title, body, data, ok := BuildMessage(notificationType, payload)
	if !ok {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "unknown_or_malformed_type"),
		)
		return
	}

	messages := make([]expoMessage, len(devices))
	for i, d := range devices {
		messages[i] = expoMessage{
			To:    d.ExpoPushToken,
			Title: title,
			Body:  body,
			Data:  data,
		}
	}

	reqBody, err := json.Marshal(messages)
	if err != nil {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "marshal_failed"),
			slog.Any("err", err),
		)
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoAPIURL, bytes.NewReader(reqBody))
	if err != nil {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "build_request_failed"),
			slog.Any("err", err),
		)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if s.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.accessToken)
	}

	resp, err := s.http.Do(req)
	if err != nil {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "transport_error"),
			slog.Int("device_count", len(devices)),
			slog.Any("err", err),
		)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "non_2xx_response"),
			slog.Int("status_code", resp.StatusCode),
			slog.Int("device_count", len(devices)),
		)
		return
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "read_response_failed"),
			slog.Any("err", err),
		)
		return
	}

	var expoResp expoResponse
	if err := json.Unmarshal(respBody, &expoResp); err != nil {
		// Log the failure but don't prune — we can't trust the ticket order.
		log.WarnContext(ctx, "push_send_failed",
			slog.String("component", "push"),
			slog.String("recipient_id", recipientID),
			slog.String("notification_type", notificationType),
			slog.String("reason", "unmarshal_tickets_failed"),
			slog.Any("err", err),
		)
		return
	}

	log.InfoContext(ctx, "push_sent",
		slog.String("component", "push"),
		slog.String("recipient_id", recipientID),
		slog.String("notification_type", notificationType),
		slog.Int("device_count", len(devices)),
	)

	// Tickets are returned in the same order as the messages array. Prune any
	// token that Expo reports as DeviceNotRegistered so the DB stays clean.
	for i, ticket := range expoResp.Data {
		if i >= len(devices) {
			break
		}
		if ticket.Status == "error" && ticket.Details.Error == "DeviceNotRegistered" {
			token := devices[i].ExpoPushToken
			if pruneErr := s.q.DeleteDeviceByToken(ctx, token); pruneErr != nil {
				log.WarnContext(ctx, "push_send_failed",
					slog.String("component", "push"),
					slog.String("recipient_id", recipientID),
					slog.String("notification_type", notificationType),
					slog.String("reason", "prune_token_failed"),
					// Log only a prefix of the token — never the full credential.
					slog.String("token_prefix", tokenPrefix(token)),
					slog.Any("err", pruneErr),
				)
			} else {
				log.InfoContext(ctx, "push_token_pruned",
					slog.String("component", "push"),
					slog.String("recipient_id", recipientID),
					slog.String("token_prefix", tokenPrefix(token)),
				)
			}
		}
	}
}
