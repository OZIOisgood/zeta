package contact

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestCreateStoresAndSendsLandingContact(t *testing.T) {
	store := &fakeStore{}
	sender := &fakeSender{id: "resend-1"}
	h := NewHandler(store, sender, nil, "", testLogger())
	req := request(`{"name":" Ada Coach ","email":" ADA@example.com ","message":" Hello support ","locale":"en","page_url":"https://strido.net/en/contact.html"}`)
	rec := httptest.NewRecorder()

	h.Create(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	if !store.created || store.createParams.Name != "Ada Coach" || store.createParams.Email != "ada@example.com" {
		t.Fatalf("submission was not normalized and stored: %+v", store.createParams)
	}
	if sender.submission.Message != "Hello support" {
		t.Fatalf("sent message %q, want trimmed message", sender.submission.Message)
	}
	if !store.sent || store.sentParams.ResendEmailID != "resend-1" {
		t.Fatalf("email success was not stored: %+v", store.sentParams)
	}
}

func TestCreateValidatesBeforePersisting(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "missing name", body: `{"email":"ada@example.com","message":"Hello"}`},
		{name: "invalid email", body: `{"name":"Ada","email":"not-an-email","message":"Hello"}`},
		{name: "missing message", body: `{"name":"Ada","email":"ada@example.com","message":"  "}`},
		{name: "unknown field", body: `{"name":"Ada","email":"ada@example.com","message":"Hello","admin":true}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeStore{}
			h := NewHandler(store, &fakeSender{}, nil, "", testLogger())
			rec := httptest.NewRecorder()

			h.Create(rec, request(tt.body))

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("got %d, want %d", rec.Code, http.StatusBadRequest)
			}
			if store.created {
				t.Fatal("invalid contact request was persisted")
			}
		})
	}
}

func TestCreateQuietlyAcceptsHoneypot(t *testing.T) {
	store := &fakeStore{}
	h := NewHandler(store, &fakeSender{}, nil, "", testLogger())
	rec := httptest.NewRecorder()

	h.Create(rec, request(`{"name":"Bot","email":"bot@example.com","message":"Spam","website":"https://spam.example"}`))

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusCreated)
	}
	if store.created {
		t.Fatal("honeypot submission was persisted")
	}
}

func TestCreateMarksEmailFailure(t *testing.T) {
	store := &fakeStore{}
	h := NewHandler(store, &fakeSender{err: errors.New("resend unavailable")}, nil, "", testLogger())
	rec := httptest.NewRecorder()

	h.Create(rec, request(`{"name":"Ada","email":"ada@example.com","message":"Hello"}`))

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusBadGateway)
	}
	if !store.failed || !strings.Contains(store.failedParams.EmailError, "resend unavailable") {
		t.Fatalf("email failure was not stored: %+v", store.failedParams)
	}
}

func TestCreateRateLimitsRepeatedSubmissions(t *testing.T) {
	store := &fakeStore{}
	h := NewHandler(store, &fakeSender{}, nil, "", testLogger())
	body := `{"name":"Ada","email":"ada@example.com","message":"Hello"}`

	for i := 0; i < 4; i++ {
		rec := httptest.NewRecorder()
		h.Create(rec, request(body))
		if i < 3 && rec.Code != http.StatusCreated {
			t.Fatalf("request %d got %d, want %d", i+1, rec.Code, http.StatusCreated)
		}
		if i == 3 {
			if rec.Code != http.StatusTooManyRequests {
				t.Fatalf("request 4 got %d, want %d", rec.Code, http.StatusTooManyRequests)
			}
			if rec.Header().Get("Retry-After") != "600" {
				t.Fatalf("Retry-After = %q, want 600", rec.Header().Get("Retry-After"))
			}
		}
	}
}

type fakeStore struct {
	created      bool
	createParams db.CreateLandingContactSubmissionParams
	sent         bool
	sentParams   db.MarkLandingContactEmailSentParams
	failed       bool
	failedParams db.MarkLandingContactEmailFailedParams
}

func (s *fakeStore) CreateLandingContactSubmission(_ context.Context, arg db.CreateLandingContactSubmissionParams) (db.LandingContactSubmission, error) {
	s.created = true
	s.createParams = arg
	return db.LandingContactSubmission{
		ID: testUUID(), Name: arg.Name, Email: arg.Email, Message: arg.Message,
		Locale: arg.Locale, PageUrl: arg.PageUrl, UserAgent: arg.UserAgent,
	}, nil
}

func (s *fakeStore) MarkLandingContactEmailSent(_ context.Context, arg db.MarkLandingContactEmailSentParams) error {
	s.sent = true
	s.sentParams = arg
	return nil
}

func (s *fakeStore) MarkLandingContactEmailFailed(_ context.Context, arg db.MarkLandingContactEmailFailedParams) error {
	s.failed = true
	s.failedParams = arg
	return nil
}

type fakeSender struct {
	id         string
	err        error
	submission db.LandingContactSubmission
}

func (s *fakeSender) Send(_ context.Context, submission db.LandingContactSubmission) (string, error) {
	s.submission = submission
	return s.id, s.err
}

func request(body string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/contact", strings.NewReader(body))
	req.RemoteAddr = "192.0.2.10:4321"
	req.Header.Set("User-Agent", "contact-test")
	return req
}

func testUUID() pgtype.UUID {
	return pgtype.UUID{Bytes: [16]byte{0x9a, 0x02, 0x57, 0x76, 0x67, 0x91, 0x45, 0xc8, 0x90, 0x7f, 0x09, 0xe6, 0x50, 0x58, 0x74, 0x7a}, Valid: true}
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}
