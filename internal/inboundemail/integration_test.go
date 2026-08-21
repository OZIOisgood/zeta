//go:build integration

package inboundemail_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/testdb"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestIntegration_InboundEmailUpsertAndClaimAreIdempotent(t *testing.T) {
	pool := testdb.New(t)
	q := db.New(pool)
	ctx := context.Background()
	params := db.UpsertInboundEmailParams{
		ResendEmailID:    "received-email-1",
		SvixID:           "svix-1",
		Inbox:            "support",
		InboxAddress:     "support-dev@strido.net",
		Sender:           "sender@example.com",
		Recipients:       []string{"support-dev@strido.net"},
		Cc:               []string{},
		Bcc:              []string{},
		Subject:          "Help",
		MessageID:        "message-1",
		ReceivedAt:       pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		DiscordChannelID: "support-forum",
		ForwardingStatus: "pending",
	}

	first, err := q.UpsertInboundEmail(ctx, params)
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	params.SvixID = "svix-replay"
	second, err := q.UpsertInboundEmail(ctx, params)
	if err != nil {
		t.Fatalf("replay upsert: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("replay created a second row: %v != %v", first.ID, second.ID)
	}

	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM inbound_emails WHERE resend_email_id = $1`, params.ResendEmailID).Scan(&count); err != nil {
		t.Fatalf("count rows: %v", err)
	}
	if count != 1 {
		t.Fatalf("got %d rows, want 1", count)
	}

	claimed, err := q.ClaimInboundEmailByResendID(ctx, params.ResendEmailID)
	if err != nil {
		t.Fatalf("first claim: %v", err)
	}
	if _, err := q.ClaimInboundEmailByResendID(ctx, params.ResendEmailID); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("concurrent claim error = %v, want pgx.ErrNoRows", err)
	}

	if err := q.MarkInboundEmailDiscordPosted(ctx, db.MarkInboundEmailDiscordPostedParams{
		ID: claimed.ID, DiscordThreadID: "thread-1", DiscordMessageID: "message-1",
	}); err != nil {
		t.Fatalf("mark discord posted: %v", err)
	}
	if err := q.MarkInboundEmailForwarded(ctx, db.MarkInboundEmailForwardedParams{
		ID: claimed.ID, ForwardingEmailID: "forward-1",
	}); err != nil {
		t.Fatalf("mark forwarded: %v", err)
	}
	if err := q.ReleaseInboundEmailClaim(ctx, claimed.ID); err != nil {
		t.Fatalf("release claim: %v", err)
	}
	if _, err := q.ClaimInboundEmailByResendID(ctx, params.ResendEmailID); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("processed row was reclaimed: %v", err)
	}
}

func TestIntegration_AdminReplyMarksInboundEmailReplied(t *testing.T) {
	pool := testdb.New(t)
	q := db.New(pool)
	ctx := context.Background()
	email, err := q.UpsertInboundEmail(ctx, db.UpsertInboundEmailParams{
		ResendEmailID:    "received-admin-reply-1",
		SvixID:           "svix-admin-reply-1",
		Inbox:            "social",
		InboxAddress:     "social@strido.net",
		Sender:           "Sender <sender@example.com>",
		Recipients:       []string{"social@strido.net"},
		Cc:               []string{},
		Bcc:              []string{},
		Subject:          "Partnership",
		MessageID:        "message-admin-reply-1",
		ReceivedAt:       pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		DiscordChannelID: "social-forum",
		ForwardingStatus: "pending",
	})
	if err != nil {
		t.Fatalf("create inbound email: %v", err)
	}

	idempotencyKey := uuid.New()
	reply, err := q.CreateInboundEmailReply(ctx, db.CreateInboundEmailReplyParams{
		InboundEmailID:    email.ID,
		IdempotencyKey:    pgtype.UUID{Bytes: idempotencyKey, Valid: true},
		SenderUserID:      "admin-1",
		SenderDisplayName: "Admin",
		FromAddress:       "social@strido.net",
		ToAddress:         "sender@example.com",
		Subject:           "Re: Partnership",
		BodyText:          "Thanks for contacting us.",
	})
	if err != nil {
		t.Fatalf("create reply: %v", err)
	}

	sent, err := q.MarkInboundEmailReplySent(ctx, db.MarkInboundEmailReplySentParams{
		ResendEmailID: "resend-outbound-1",
		ReplyID:       reply.ID,
	})
	if err != nil {
		t.Fatalf("mark reply sent: %v", err)
	}
	if sent.DeliveryStatus != "sent" || !sent.SentAt.Valid {
		t.Fatalf("sent reply status = %q, sent_at valid = %t", sent.DeliveryStatus, sent.SentAt.Valid)
	}

	updated, err := q.GetAdminInboundEmail(ctx, email.ID)
	if err != nil {
		t.Fatalf("get updated inbound email: %v", err)
	}
	if updated.HandlingStatus != "replied" || !updated.ReadAt.Valid {
		t.Fatalf("inbound email status = %q, read_at valid = %t", updated.HandlingStatus, updated.ReadAt.Valid)
	}
}
