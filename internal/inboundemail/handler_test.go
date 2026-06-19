package inboundemail

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestResendWebhookVerification(t *testing.T) {
	provider := NewResendProvider("re_test")
	payload := []byte(`{"type":"email.received"}`)
	secretBytes := []byte("01234567890123456789012345678901")
	secret := "whsec_" + base64.StdEncoding.EncodeToString(secretBytes)
	headers := signedHeaders(payload, secretBytes, time.Now())

	if err := provider.VerifyWebhook(payload, headers, secret); err != nil {
		t.Fatalf("valid signature rejected: %v", err)
	}
	if err := provider.VerifyWebhook([]byte(`{"type":"changed"}`), headers, secret); err == nil {
		t.Fatal("tampered payload was accepted")
	}
	staleHeaders := signedHeaders(payload, secretBytes, time.Now().Add(-10*time.Minute))
	if err := provider.VerifyWebhook(payload, staleHeaders, secret); err == nil {
		t.Fatal("stale signature was accepted")
	}
	if err := provider.VerifyWebhook(payload, WebhookHeaders{}, secret); err == nil {
		t.Fatal("missing headers were accepted")
	}
}

func TestWebhookRejectsInvalidSignature(t *testing.T) {
	store := &fakeStore{}
	provider := &fakeProvider{verifyErr: errors.New("bad signature")}
	handler := testHandler(store, provider, nil)
	req := httptest.NewRequest(http.MethodPost, "/webhooks/resend", strings.NewReader(`{"type":"email.received"}`))
	rec := httptest.NewRecorder()

	handler.Webhook(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
	if store.upsertCalls != 0 {
		t.Fatal("invalid webhook must not be persisted")
	}
}

func TestWebhookPersistsBeforeDeliveryAndDeduplicatesReplay(t *testing.T) {
	store := &fakeStore{}
	provider := &fakeProvider{received: ReceivedEmail{
		ID:        "email-1",
		From:      "Ada <ada@example.com>",
		To:        []string{"support-dev@strido.net"},
		Subject:   "Need help",
		MessageID: "message-1",
		CreatedAt: time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC),
		Text:      "Please help with my video.",
	}}
	poster := &fakePoster{thread: discord.Thread{ThreadID: "thread-1", MessageID: "message-1"}}
	handler := testHandler(store, provider, poster)
	payload := `{"type":"email.received","created_at":"2026-06-18T09:00:00Z","data":{"email_id":"email-1","created_at":"2026-06-18T09:00:00Z","from":"Ada <ada@example.com>","to":["support-dev@strido.net"],"cc":[],"bcc":[],"message_id":"message-1","subject":"Need help"}}`

	for range 2 {
		req := httptest.NewRequest(http.MethodPost, "/webhooks/resend", strings.NewReader(payload))
		rec := httptest.NewRecorder()
		handler.Webhook(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}
	}

	if store.upsertCalls != 2 {
		t.Fatalf("got %d upserts, want 2 idempotent upserts", store.upsertCalls)
	}
	if store.deliveryBeforeUpsert {
		t.Fatal("delivery happened before persistence")
	}
	if provider.getCalls != 1 || poster.calls != 1 || provider.forwardCalls != 1 {
		t.Fatalf("duplicate delivery: get=%d discord=%d forward=%d", provider.getCalls, poster.calls, provider.forwardCalls)
	}
	if store.upsertParams.Inbox != "support" || store.upsertParams.DiscordChannelID != "support-forum" {
		t.Fatalf("wrong route persisted: %+v", store.upsertParams)
	}
	if !store.posted || !store.forwarded || store.releaseCalls != 1 {
		t.Fatalf("delivery state not persisted: %+v", store)
	}
}

func TestProcessClaimedRetriesOnlyFailedForward(t *testing.T) {
	store := &fakeStore{upsertCalls: 1}
	provider := &fakeProvider{received: ReceivedEmail{
		ID:        "email-2",
		From:      "sender@example.com",
		To:        []string{"dsa-dev@strido.net"},
		Subject:   "DSA request",
		CreatedAt: time.Now().UTC(),
		HTML:      "<p>Hello <strong>team</strong></p>",
	}}
	poster := &fakePoster{}
	handler := testHandler(store, provider, poster)
	row := fakeInboundRow()
	row.DiscordStatus = "posted"
	row.ForwardingStatus = "failed"

	if err := handler.processClaimed(context.Background(), row); err != nil {
		t.Fatal(err)
	}
	if poster.calls != 0 {
		t.Fatal("already-posted Discord delivery was duplicated")
	}
	if provider.forwardCalls != 1 || !store.forwarded {
		t.Fatal("failed forwarding delivery was not retried")
	}
	if store.contentParams.BodyText != "Hello team." {
		t.Fatalf("HTML fallback produced %q", store.contentParams.BodyText)
	}
}

func TestProcessClaimedForwardsWhenDiscordFails(t *testing.T) {
	store := &fakeStore{upsertCalls: 1}
	provider := &fakeProvider{received: ReceivedEmail{
		ID:        "email-3",
		From:      "sender@example.com",
		To:        []string{"social-dev@strido.net"},
		CreatedAt: time.Now().UTC(),
		Text:      "Hello",
	}}
	poster := &fakePoster{err: errors.New("discord unavailable")}
	handler := testHandler(store, provider, poster)

	if err := handler.processClaimed(context.Background(), fakeInboundRow()); err == nil {
		t.Fatal("Discord failure should be reported")
	}
	if !store.failedDiscord {
		t.Fatal("Discord failure was not persisted")
	}
	if provider.forwardCalls != 1 || !store.forwarded {
		t.Fatal("Discord failure blocked forwarding")
	}
}

func TestReconcileUpsertsEmailMissedByWebhook(t *testing.T) {
	store := &fakeStore{}
	provider := &fakeProvider{listed: []ReceivedEmail{{
		ID:        "missed-email",
		From:      "sender@example.com",
		To:        []string{"social-dev@strido.net"},
		CreatedAt: time.Now().UTC(),
	}}}
	handler := testHandler(store, provider, nil)
	req := httptest.NewRequest(http.MethodPost, "/internal/inbound-email/reconcile", nil)
	rec := httptest.NewRecorder()

	handler.Reconcile(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if store.upsertCalls != 1 || store.upsertParams.ResendEmailID != "missed-email" {
		t.Fatalf("missed email was not upserted: %+v", store.upsertParams)
	}
}

func TestForwardReceivedEmailPreservesAttachmentsAndIdempotency(t *testing.T) {
	var requestBody struct {
		To          []string `json:"to"`
		Attachments []struct {
			Path      string `json:"path"`
			Filename  string `json:"filename"`
			ContentID string `json:"content_id"`
		} `json:"attachments"`
	}
	var idempotencyKey string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey = r.Header.Get("Idempotency-Key")
		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		writeJSON(w, http.StatusOK, map[string]string{"id": "forward-1"})
	}))
	defer server.Close()

	provider := NewResendProvider("re_test")
	baseURL, err := url.Parse(server.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	provider.client.BaseURL = baseURL
	forwardID, err := provider.ForwardReceivedEmail(context.Background(), ReceivedEmail{
		ID:        "received-1",
		From:      "Ada <ada@example.com>",
		Subject:   "Hello",
		Text:      "Body",
		CreatedAt: time.Now().UTC(),
		Attachments: []Attachment{{
			Filename: "photo.png", DownloadURL: "https://signed.example/photo", ContentID: "<photo-1>",
		}},
	}, []string{"copy@example.com"}, "notifications@strido.net", "inbound-forward-received-1")
	if err != nil {
		t.Fatal(err)
	}
	if forwardID != "forward-1" || idempotencyKey != "inbound-forward-received-1" {
		t.Fatalf("forward id=%q key=%q", forwardID, idempotencyKey)
	}
	if len(requestBody.Attachments) != 1 || requestBody.Attachments[0].Path != "https://signed.example/photo" {
		t.Fatalf("attachment was not forwarded: %+v", requestBody.Attachments)
	}
	if requestBody.Attachments[0].ContentID != "photo-1" {
		t.Fatalf("content ID = %q, want photo-1", requestBody.Attachments[0].ContentID)
	}
}

func TestConfiguredRoutesMatchAllInboxes(t *testing.T) {
	handler := testHandler(&fakeStore{}, &fakeProvider{}, nil)
	tests := []struct {
		address string
		inbox   string
	}{
		{address: "Social Dev <social-dev@strido.net>", inbox: "social"},
		{address: "SUPPORT-DEV@STRIDO.NET", inbox: "support"},
		{address: "dsa-dev@strido.net", inbox: "dsa"},
	}
	for _, tt := range tests {
		route, ok := handler.matchRoute([]string{tt.address})
		if !ok || route.Inbox != tt.inbox {
			t.Fatalf("route %q = %+v, %v", tt.address, route, ok)
		}
	}
	if _, ok := handler.matchRoute([]string{"unknown@strido.net"}); ok {
		t.Fatal("unsupported recipient matched a route")
	}
}

func testHandler(store *fakeStore, provider *fakeProvider, poster discord.Poster) *Handler {
	handler := NewHandler(store, provider, poster, slog.New(slog.NewTextHandler(io.Discard, nil)), Config{
		WebhookSigningSecret: "whsec_test",
		ForwardFrom:          "notifications@strido.net",
		CopyRecipients:       []string{"pashalobaryev111@gmail.com", "support-dev@strido.net"},
		Routes: []Route{
			{Inbox: "social", Address: "social-dev@strido.net", DiscordChannelID: "social-forum"},
			{Inbox: "support", Address: "support-dev@strido.net", DiscordChannelID: "support-forum"},
			{Inbox: "dsa", Address: "dsa-dev@strido.net", DiscordChannelID: "dsa-forum"},
		},
	})
	handler.startProcessing = func(resendEmailID string) {
		_ = handler.processByResendID(context.Background(), resendEmailID)
	}
	return handler
}

type fakeStore struct {
	upsertCalls          int
	upsertParams         db.UpsertInboundEmailParams
	claimCalls           int
	deliveryBeforeUpsert bool
	contentParams        db.UpdateInboundEmailContentParams
	posted               bool
	failedDiscord        bool
	forwarded            bool
	failedForward        bool
	releaseCalls         int
}

func (s *fakeStore) UpsertInboundEmail(_ context.Context, arg db.UpsertInboundEmailParams) (db.InboundEmail, error) {
	s.upsertCalls++
	s.upsertParams = arg
	row := fakeInboundRow()
	row.ResendEmailID = arg.ResendEmailID
	row.Inbox = arg.Inbox
	row.InboxAddress = arg.InboxAddress
	row.Sender = arg.Sender
	row.Recipients = arg.Recipients
	row.Subject = arg.Subject
	row.ReceivedAt = arg.ReceivedAt
	row.DiscordChannelID = arg.DiscordChannelID
	row.ForwardingStatus = arg.ForwardingStatus
	return row, nil
}

func (s *fakeStore) ClaimInboundEmailByResendID(_ context.Context, resendEmailID string) (db.InboundEmail, error) {
	s.claimCalls++
	if s.claimCalls > 1 {
		return db.InboundEmail{}, pgx.ErrNoRows
	}
	if s.upsertCalls == 0 {
		s.deliveryBeforeUpsert = true
	}
	row := fakeInboundRow()
	row.ResendEmailID = resendEmailID
	return row, nil
}

func (s *fakeStore) ClaimPendingInboundEmails(context.Context, int32) ([]db.InboundEmail, error) {
	return nil, nil
}

func (s *fakeStore) UpdateInboundEmailContent(_ context.Context, arg db.UpdateInboundEmailContentParams) error {
	s.contentParams = arg
	return nil
}

func (s *fakeStore) MarkInboundEmailDiscordPosted(_ context.Context, _ db.MarkInboundEmailDiscordPostedParams) error {
	s.posted = true
	return nil
}

func (s *fakeStore) MarkInboundEmailDiscordFailed(_ context.Context, _ db.MarkInboundEmailDiscordFailedParams) error {
	s.failedDiscord = true
	return nil
}

func (s *fakeStore) MarkInboundEmailDiscordSkipped(context.Context, db.MarkInboundEmailDiscordSkippedParams) error {
	return nil
}

func (s *fakeStore) MarkInboundEmailForwarded(_ context.Context, _ db.MarkInboundEmailForwardedParams) error {
	s.forwarded = true
	return nil
}

func (s *fakeStore) MarkInboundEmailForwardingFailed(_ context.Context, _ db.MarkInboundEmailForwardingFailedParams) error {
	s.failedForward = true
	return nil
}

func (s *fakeStore) MarkInboundEmailForwardingSkipped(context.Context, db.MarkInboundEmailForwardingSkippedParams) error {
	return nil
}

func (s *fakeStore) ReleaseInboundEmailClaim(context.Context, pgtype.UUID) error {
	s.releaseCalls++
	return nil
}

type fakeProvider struct {
	verifyErr    error
	received     ReceivedEmail
	getErr       error
	getCalls     int
	forwardID    string
	forwardErr   error
	forwardCalls int
	listed       []ReceivedEmail
	listErr      error
}

func (p *fakeProvider) VerifyWebhook([]byte, WebhookHeaders, string) error { return p.verifyErr }

func (p *fakeProvider) GetReceivedEmail(context.Context, string) (ReceivedEmail, error) {
	p.getCalls++
	return p.received, p.getErr
}

func (p *fakeProvider) ListReceivedEmails(context.Context, int) ([]ReceivedEmail, error) {
	return p.listed, p.listErr
}

func (p *fakeProvider) ForwardReceivedEmail(context.Context, ReceivedEmail, []string, string, string) (string, error) {
	p.forwardCalls++
	if p.forwardID == "" {
		p.forwardID = "forward-1"
	}
	return p.forwardID, p.forwardErr
}

type fakePoster struct {
	calls  int
	post   discord.Post
	thread discord.Thread
	err    error
}

func (p *fakePoster) CreateForumPost(_ context.Context, _ string, post discord.Post) (discord.Thread, error) {
	p.calls++
	p.post = post
	return p.thread, p.err
}

func fakeInboundRow() db.InboundEmail {
	return db.InboundEmail{
		ID:                 pgtype.UUID{Bytes: [16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}, Valid: true},
		ResendEmailID:      "email-1",
		Inbox:              "support",
		InboxAddress:       "support-dev@strido.net",
		Sender:             "Ada <ada@example.com>",
		Recipients:         []string{"support-dev@strido.net"},
		ReceivedAt:         pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		DiscordStatus:      "pending",
		DiscordChannelID:   "support-forum",
		ForwardingStatus:   "pending",
		ProcessingStatus:   "processing",
		ProcessingAttempts: 1,
	}
}

func signedHeaders(payload, secret []byte, at time.Time) WebhookHeaders {
	id := "msg_test"
	timestamp := strconv.FormatInt(at.Unix(), 10)
	hash := hmac.New(sha256.New, secret)
	_, _ = fmt.Fprintf(hash, "%s.%s.%s", id, timestamp, payload)
	return WebhookHeaders{
		ID:        id,
		Timestamp: timestamp,
		Signature: "v1," + base64.StdEncoding.EncodeToString(hash.Sum(nil)),
	}
}

func TestAttachmentMetadataJSONDoesNotPersistDownloadURL(t *testing.T) {
	data, err := json.Marshal([]Attachment{{Filename: "secret.txt", DownloadURL: "https://signed.example"}})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "signed.example") {
		t.Fatal("temporary signed attachment URL must not be persisted")
	}
}
