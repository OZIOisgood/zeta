package notifications

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	listLimit         = 30
	heartbeatInterval = 25 * time.Second
)

type Handler struct {
	q      db.Querier
	hub    *Hub
	logger *slog.Logger
}

func NewHandler(q db.Querier, hub *Hub, logger *slog.Logger) *Handler {
	return &Handler{q: q, hub: hub, logger: logger}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.List)
	r.Get("/stream", h.Stream)
	r.Post("/read-all", h.MarkAllRead)
	r.Post("/{id}/read", h.MarkRead)
}

type listResponse struct {
	Items       []item `json:"items"`
	UnreadCount int64  `json:"unread_count"`
}

// List returns the recipient's most recent notifications plus the unread count.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := h.q.ListNotifications(ctx, db.ListNotificationsParams{
		RecipientID: user.ID,
		Limit:       listLimit,
	})
	if err != nil {
		log.ErrorContext(ctx, "notifications_list_failed",
			slog.String("component", "notifications"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list notifications", http.StatusInternalServerError)
		return
	}

	unread, err := h.q.CountUnreadNotifications(ctx, user.ID)
	if err != nil {
		log.ErrorContext(ctx, "notifications_unread_count_failed",
			slog.String("component", "notifications"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to count notifications", http.StatusInternalServerError)
		return
	}

	// Collect invitation codes for a single batch lookup instead of N+1 queries.
	var codes []string
	for _, row := range rows {
		if string(row.Type) == string(TypeGroupInvitationReceived) {
			var p struct {
				Code string `json:"code"`
			}
			if json.Unmarshal(row.Payload, &p) == nil && p.Code != "" {
				codes = append(codes, p.Code)
			}
		}
	}
	statusByCode := make(map[string]string, len(codes))
	if len(codes) > 0 {
		invitations, err := h.q.GetGroupInvitationsByCodes(ctx, codes)
		if err != nil {
			log.WarnContext(ctx, "invitation_status_batch_lookup_failed",
				slog.String("component", "notifications"),
				slog.Any("err", err),
			)
		} else {
			for _, inv := range invitations {
				statusByCode[inv.Code] = string(inv.Status)
			}
		}
	}

	items := make([]item, 0, len(rows))
	for _, row := range rows {
		it := toItem(row)
		if it.Type == string(TypeGroupInvitationReceived) {
			var p struct {
				Code string `json:"code"`
			}
			if json.Unmarshal(it.Payload, &p) == nil && p.Code != "" {
				if status, ok := statusByCode[p.Code]; ok {
					it.InviteStatus = status
				} else {
					// Not found in DB means the invitation was deleted.
					it.InviteStatus = "expired"
				}
			}
		}
		items = append(items, it)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listResponse{Items: items, UnreadCount: unread})
}

// MarkRead marks a single notification read. The recipient is part of the WHERE
// clause, so a user can only ever mark their own notifications.
func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var id pgtype.UUID
	if err := id.Scan(chi.URLParam(r, "id")); err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := h.q.MarkNotificationRead(ctx, db.MarkNotificationReadParams{
		ID:          id,
		RecipientID: user.ID,
	}); err != nil {
		log.ErrorContext(ctx, "notification_mark_read_failed",
			slog.String("component", "notifications"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update notification", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// MarkAllRead marks every unread notification of the recipient as read.
func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.q.MarkAllNotificationsRead(ctx, user.ID); err != nil {
		log.ErrorContext(ctx, "notifications_mark_all_read_failed",
			slog.String("component", "notifications"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update notifications", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Stream opens a Server-Sent Events connection that pushes newly created
// notifications for the authenticated user. Auth is cookie-based, so the browser
// EventSource (withCredentials) is validated by the global auth middleware.
func (h *Handler) Stream(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // disable proxy buffering (nginx)
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	ch := h.hub.Subscribe(user.ID)
	defer h.hub.Unsubscribe(user.ID, ch)

	log.InfoContext(ctx, "notification_stream_opened",
		slog.String("component", "notifications"),
		slog.String("user_id", user.ID),
	)

	heartbeat := time.NewTicker(heartbeatInterval)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		}
	}
}
