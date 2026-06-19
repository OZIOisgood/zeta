package inboundemail

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	component          = "inbound_email"
	maxWebhookBodySize = 1 << 20
	reconcileListLimit = 100
	reconcileBatchSize = 20
)

type Store interface {
	UpsertInboundEmail(ctx context.Context, arg db.UpsertInboundEmailParams) (db.InboundEmail, error)
	ClaimInboundEmailByResendID(ctx context.Context, resendEmailID string) (db.InboundEmail, error)
	ClaimPendingInboundEmails(ctx context.Context, limit int32) ([]db.InboundEmail, error)
	UpdateInboundEmailContent(ctx context.Context, arg db.UpdateInboundEmailContentParams) error
	MarkInboundEmailDiscordPosted(ctx context.Context, arg db.MarkInboundEmailDiscordPostedParams) error
	MarkInboundEmailDiscordFailed(ctx context.Context, arg db.MarkInboundEmailDiscordFailedParams) error
	MarkInboundEmailDiscordSkipped(ctx context.Context, arg db.MarkInboundEmailDiscordSkippedParams) error
	MarkInboundEmailForwarded(ctx context.Context, arg db.MarkInboundEmailForwardedParams) error
	MarkInboundEmailForwardingFailed(ctx context.Context, arg db.MarkInboundEmailForwardingFailedParams) error
	MarkInboundEmailForwardingSkipped(ctx context.Context, arg db.MarkInboundEmailForwardingSkippedParams) error
	ReleaseInboundEmailClaim(ctx context.Context, id pgtype.UUID) error
}

type Handler struct {
	q               Store
	provider        Provider
	discord         discord.Poster
	logger          *slog.Logger
	config          Config
	routeByTo       map[string]Route
	startProcessing func(string)
}

func NewHandler(q Store, provider Provider, discordPoster discord.Poster, logger *slog.Logger, config Config) *Handler {
	routeByTo := make(map[string]Route, len(config.Routes))
	for _, route := range config.Routes {
		address := normalizeAddress(route.Address)
		if address == "" {
			continue
		}
		route.Address = address
		route.DiscordChannelID = strings.TrimSpace(route.DiscordChannelID)
		routeByTo[address] = route
	}

	config.WebhookSigningSecret = strings.TrimSpace(config.WebhookSigningSecret)
	config.ForwardFrom = strings.TrimSpace(config.ForwardFrom)
	config.CopyRecipients = filterCopyRecipients(config.CopyRecipients, routeByTo)
	h := &Handler{
		q:         q,
		provider:  provider,
		discord:   discordPoster,
		logger:    logger,
		config:    config,
		routeByTo: routeByTo,
	}
	h.startProcessing = h.processAsync
	return h
}

type webhookEvent struct {
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"created_at"`
	Data      struct {
		EmailID   string    `json:"email_id"`
		CreatedAt time.Time `json:"created_at"`
		From      string    `json:"from"`
		To        []string  `json:"to"`
		Cc        []string  `json:"cc"`
		Bcc       []string  `json:"bcc"`
		MessageID string    `json:"message_id"`
		Subject   string    `json:"subject"`
	} `json:"data"`
}

func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	if h.provider == nil || h.q == nil {
		http.Error(w, "Inbound email is not configured", http.StatusServiceUnavailable)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxWebhookBodySize)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	headers := WebhookHeaders{
		ID:        r.Header.Get("svix-id"),
		Timestamp: r.Header.Get("svix-timestamp"),
		Signature: r.Header.Get("svix-signature"),
	}
	if err := h.provider.VerifyWebhook(payload, headers, h.config.WebhookSigningSecret); err != nil {
		log.WarnContext(ctx, "inbound_email_webhook_verification_failed",
			slog.String("component", component),
			slog.Any("err", err),
		)
		http.Error(w, "Invalid webhook", http.StatusBadRequest)
		return
	}

	var event webhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		http.Error(w, "Invalid webhook payload", http.StatusBadRequest)
		return
	}
	if event.Type != "email.received" {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}
	if strings.TrimSpace(event.Data.EmailID) == "" {
		http.Error(w, "Invalid webhook payload", http.StatusBadRequest)
		return
	}

	route, ok := h.matchRoute(event.Data.To)
	if !ok {
		log.WarnContext(ctx, "inbound_email_recipient_ignored",
			slog.String("component", component),
			slog.String("resend_email_id", event.Data.EmailID),
			slog.Int("recipient_count", len(event.Data.To)),
		)
		writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}

	receivedAt := event.Data.CreatedAt
	if receivedAt.IsZero() {
		receivedAt = event.CreatedAt
	}
	if receivedAt.IsZero() {
		receivedAt = time.Now().UTC()
	}
	if _, err := h.upsert(ctx, headers.ID, route, ReceivedEmail{
		ID:        event.Data.EmailID,
		From:      event.Data.From,
		To:        event.Data.To,
		Cc:        event.Data.Cc,
		Bcc:       event.Data.Bcc,
		Subject:   event.Data.Subject,
		MessageID: event.Data.MessageID,
		CreatedAt: receivedAt,
	}); err != nil {
		log.ErrorContext(ctx, "inbound_email_webhook_persist_failed",
			slog.String("component", component),
			slog.String("resend_email_id", event.Data.EmailID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to persist webhook", http.StatusInternalServerError)
		return
	}

	h.startProcessing(event.Data.EmailID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

func (h *Handler) Reconcile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	if h.provider == nil || h.q == nil {
		http.Error(w, "Inbound email is not configured", http.StatusServiceUnavailable)
		return
	}

	emails, err := h.provider.ListReceivedEmails(ctx, reconcileListLimit)
	if err != nil {
		log.ErrorContext(ctx, "inbound_email_reconcile_list_failed",
			slog.String("component", component),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list received emails", http.StatusBadGateway)
		return
	}

	upserted := 0
	for _, email := range emails {
		route, ok := h.matchRoute(email.To)
		if !ok {
			continue
		}
		if _, err := h.upsert(ctx, "", route, email); err != nil {
			log.ErrorContext(ctx, "inbound_email_reconcile_persist_failed",
				slog.String("component", component),
				slog.String("resend_email_id", email.ID),
				slog.Any("err", err),
			)
			continue
		}
		upserted++
	}

	claimed, err := h.q.ClaimPendingInboundEmails(ctx, reconcileBatchSize)
	if err != nil {
		log.ErrorContext(ctx, "inbound_email_reconcile_claim_failed",
			slog.String("component", component),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to claim inbound emails", http.StatusInternalServerError)
		return
	}

	failed := 0
	for _, email := range claimed {
		if err := h.processClaimed(ctx, email); err != nil {
			failed++
			log.ErrorContext(ctx, "inbound_email_reconcile_processing_failed",
				slog.String("component", component),
				slog.String("resend_email_id", email.ResendEmailID),
				slog.Any("err", err),
			)
		}
	}

	log.InfoContext(ctx, "inbound_email_reconcile_completed",
		slog.String("component", component),
		slog.Int("listed_count", len(emails)),
		slog.Int("upserted_count", upserted),
		slog.Int("claimed_count", len(claimed)),
		slog.Int("failed_count", failed),
	)
	writeJSON(w, http.StatusOK, map[string]int{
		"listed":   len(emails),
		"upserted": upserted,
		"claimed":  len(claimed),
		"failed":   failed,
	})
}

func (h *Handler) processByResendID(ctx context.Context, resendEmailID string) error {
	row, err := h.q.ClaimInboundEmailByResendID(ctx, resendEmailID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("claim inbound email: %w", err)
	}
	return h.processClaimed(ctx, row)
}

func (h *Handler) processAsync(resendEmailID string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := h.processByResendID(ctx, resendEmailID); err != nil {
			h.logger.ErrorContext(ctx, "inbound_email_webhook_processing_failed",
				slog.String("component", component),
				slog.String("resend_email_id", resendEmailID),
				slog.Any("err", err),
			)
		}
	}()
}

func (h *Handler) upsert(ctx context.Context, svixID string, route Route, email ReceivedEmail) (db.InboundEmail, error) {
	forwardingStatus := "pending"
	if len(h.config.CopyRecipients) == 0 {
		forwardingStatus = "skipped"
	}
	return h.q.UpsertInboundEmail(ctx, db.UpsertInboundEmailParams{
		ResendEmailID:    email.ID,
		SvixID:           svixID,
		Inbox:            route.Inbox,
		InboxAddress:     route.Address,
		Sender:           email.From,
		Recipients:       email.To,
		Cc:               email.Cc,
		Bcc:              email.Bcc,
		Subject:          email.Subject,
		MessageID:        email.MessageID,
		ReceivedAt:       pgtype.Timestamptz{Time: email.CreatedAt, Valid: true},
		DiscordChannelID: route.DiscordChannelID,
		ForwardingStatus: forwardingStatus,
	})
}

func (h *Handler) matchRoute(recipients []string) (Route, bool) {
	for _, recipient := range recipients {
		if route, ok := h.routeByTo[normalizeAddress(recipient)]; ok {
			return route, true
		}
	}
	return Route{}, false
}

func filterCopyRecipients(recipients []string, routes map[string]Route) []string {
	seen := make(map[string]struct{}, len(recipients))
	filtered := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		address := normalizeAddress(recipient)
		if address == "" {
			continue
		}
		if _, loops := routes[address]; loops {
			continue
		}
		if _, duplicate := seen[address]; duplicate {
			continue
		}
		seen[address] = struct{}{}
		filtered = append(filtered, address)
	}
	return filtered
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
