package inboundemail

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestSendAdminReplyUsesOriginalInboxAddress(t *testing.T) {
	tests := []struct {
		name    string
		inbox   string
		address string
	}{
		{name: "support reply", inbox: "support", address: "support-dev@strido.net"},
		{name: "social reply", inbox: "social", address: "social-dev@strido.net"},
		{name: "dsa reply", inbox: "dsa", address: "dsa-dev@strido.net"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			row := fakeInboundRow()
			row.Inbox = tt.inbox
			row.InboxAddress = tt.address
			row.Sender = "Shannon <shannon@example.com>"
			row.Subject = "Question"
			row.MessageID = "<original@example.com>"
			row.ReferencesHeader = "<root@example.com>"
			row.HandlingStatus = "open"
			row.CreatedAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}

			store := &adminTestStore{fakeStore: &fakeStore{}, email: row}
			provider := &adminTestProvider{fakeProvider: &fakeProvider{}}
			handler := adminTestHandler(store, provider)
			req := httptest.NewRequest(http.MethodPost, "/admin/emails/"+uuidString(row.ID)+"/replies", strings.NewReader(`{
				"body":"Hello Shannon,\n\nThanks for writing.",
				"idempotency_key":"11111111-1111-4111-8111-111111111111"
			}`))
			req = withAdminUser(req, permissions.InboundEmailReply)
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusCreated {
				t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
			}
			if store.createParams.FromAddress != tt.address || store.createParams.ToAddress != "shannon@example.com" {
				t.Fatalf("persisted addresses = %s -> %s", store.createParams.FromAddress, store.createParams.ToAddress)
			}
			if provider.reply.ReplyTo != tt.address || provider.reply.To != "shannon@example.com" {
				t.Fatalf("delivery addresses = %+v", provider.reply)
			}
			if !strings.Contains(provider.reply.From, "<"+tt.address+">") {
				t.Fatalf("from = %q, want inbox address", provider.reply.From)
			}
			if provider.reply.InReplyTo != "<original@example.com>" || provider.reply.References != "<root@example.com> <original@example.com>" {
				t.Fatalf("threading headers = in-reply-to %q, references %q", provider.reply.InReplyTo, provider.reply.References)
			}
			if !strings.Contains(provider.reply.HTML, "strido-logo-320.png") || !strings.Contains(provider.reply.HTML, "Thanks for writing") {
				t.Fatal("branded reply content was not rendered")
			}
			if provider.idempotencyKey != "inbound-reply-11111111-1111-4111-8111-111111111111" {
				t.Fatalf("idempotency key = %q", provider.idempotencyKey)
			}
		})
	}
}

func TestAdminEmailRoutesEnforcePermissions(t *testing.T) {
	store := &adminTestStore{fakeStore: &fakeStore{}}
	handler := adminTestHandler(store, &adminTestProvider{fakeProvider: &fakeProvider{}})
	req := httptest.NewRequest(http.MethodGet, "/admin/emails/", nil)
	req = withAdminUser(req)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
	if store.listCalls != 0 {
		t.Fatal("permission-denied request reached the store")
	}
}

func TestListAdminEmailsAppliesInboxAndStatusFilters(t *testing.T) {
	row := fakeInboundRow()
	row.HandlingStatus = "open"
	row.BodyText = "Please help"
	store := &adminTestStore{fakeStore: &fakeStore{}, list: []db.InboundEmail{row}, count: 1}
	handler := adminTestHandler(store, &adminTestProvider{fakeProvider: &fakeProvider{}})
	req := httptest.NewRequest(http.MethodGet, "/admin/emails/?inbox=support&status=open", nil)
	req = withAdminUser(req, permissions.InboundEmailRead)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if store.listParams.Inbox != "support" || store.listParams.HandlingStatus != "open" {
		t.Fatalf("filters = %+v", store.listParams)
	}
	var response adminEmailListResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if response.Total != 1 || len(response.Items) != 1 || response.Items[0].Preview != "Please help" {
		t.Fatalf("response = %+v", response)
	}
}

type adminTestStore struct {
	*fakeStore
	email        db.InboundEmail
	list         []db.InboundEmail
	count        int64
	listCalls    int
	listParams   db.ListAdminInboundEmailsParams
	createParams db.CreateInboundEmailReplyParams
}

func (s *adminTestStore) ListAdminInboundEmails(_ context.Context, arg db.ListAdminInboundEmailsParams) ([]db.InboundEmail, error) {
	s.listCalls++
	s.listParams = arg
	return s.list, nil
}

func (s *adminTestStore) CountAdminInboundEmails(context.Context, db.CountAdminInboundEmailsParams) (int64, error) {
	return s.count, nil
}

func (s *adminTestStore) GetAdminInboundEmail(context.Context, pgtype.UUID) (db.InboundEmail, error) {
	return s.email, nil
}

func (s *adminTestStore) CreateInboundEmailReply(_ context.Context, arg db.CreateInboundEmailReplyParams) (db.InboundEmailReply, error) {
	s.createParams = arg
	return db.InboundEmailReply{
		ID:                pgtype.UUID{Bytes: [16]byte{9, 8, 7, 6, 5, 4, 3, 2, 1}, Valid: true},
		InboundEmailID:    arg.InboundEmailID,
		IdempotencyKey:    arg.IdempotencyKey,
		SenderUserID:      arg.SenderUserID,
		SenderDisplayName: arg.SenderDisplayName,
		FromAddress:       arg.FromAddress,
		ToAddress:         arg.ToAddress,
		Subject:           arg.Subject,
		BodyText:          arg.BodyText,
		DeliveryStatus:    "pending",
		CreatedAt:         pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}, nil
}

func (s *adminTestStore) MarkInboundEmailReplySent(_ context.Context, arg db.MarkInboundEmailReplySentParams) (db.MarkInboundEmailReplySentRow, error) {
	return db.MarkInboundEmailReplySentRow{
		ID:                arg.ReplyID,
		InboundEmailID:    s.createParams.InboundEmailID,
		IdempotencyKey:    s.createParams.IdempotencyKey,
		ResendEmailID:     arg.ResendEmailID,
		SenderUserID:      s.createParams.SenderUserID,
		SenderDisplayName: s.createParams.SenderDisplayName,
		FromAddress:       s.createParams.FromAddress,
		ToAddress:         s.createParams.ToAddress,
		Subject:           s.createParams.Subject,
		BodyText:          s.createParams.BodyText,
		DeliveryStatus:    "sent",
		SentAt:            pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		CreatedAt:         pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}, nil
}

type adminTestProvider struct {
	*fakeProvider
	reply          ReplyEmail
	idempotencyKey string
}

func (p *adminTestProvider) SendReply(_ context.Context, email ReplyEmail, idempotencyKey string) (string, error) {
	p.reply = email
	p.idempotencyKey = idempotencyKey
	return "resend-reply-1", nil
}

func adminTestHandler(store Store, provider Provider) http.Handler {
	h := NewHandler(store, provider, nil, slog.New(slog.NewTextHandler(io.Discard, nil)), Config{Routes: []Route{
		{Inbox: "social", Address: "social-dev@strido.net"},
		{Inbox: "support", Address: "support-dev@strido.net"},
		{Inbox: "dsa", Address: "dsa-dev@strido.net"},
	}})
	router := chi.NewRouter()
	router.Route("/admin/emails", h.RegisterAdminRoutes)
	return router
}

func withAdminUser(req *http.Request, userPermissions ...string) *http.Request {
	user := &auth.UserContext{
		ID: "user-admin", FirstName: "Pasha", LastName: "Lobaryev",
		Role: permissions.RoleAdmin, Permissions: userPermissions,
	}
	return req.WithContext(context.WithValue(req.Context(), auth.UserKey, user))
}
