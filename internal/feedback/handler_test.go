package feedback

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestCreateRequiresAuth(t *testing.T) {
	h := NewHandler(&fakeStore{}, nil, testLogger(), HandlerConfig{})
	req := httptest.NewRequest(http.MethodPost, "/feedback", strings.NewReader(`{"rating":5,"message":"Great"}`))
	rec := httptest.NewRecorder()

	h.Create(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestCreateValidatesRequest(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "rating too low", body: `{"rating":0,"message":"Great"}`},
		{name: "rating too high", body: `{"rating":6,"message":"Great"}`},
		{name: "message required", body: `{"rating":5,"message":"   "}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeStore{}
			h := NewHandler(store, nil, testLogger(), HandlerConfig{})
			req := authenticatedRequest(tt.body)
			rec := httptest.NewRecorder()

			h.Create(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("got %d, want %d", rec.Code, http.StatusBadRequest)
			}
			if store.created {
				t.Fatal("feedback should not be stored for invalid request")
			}
		})
	}
}

func TestCreateStoresFeedbackAndPostsToDiscord(t *testing.T) {
	store := &fakeStore{}
	discord := &fakeDiscord{thread: discord.Thread{ThreadID: "thread-1", MessageID: "message-1"}}
	h := NewHandler(store, discord, testLogger(), HandlerConfig{DiscordChannelID: "forum-1"})
	req := authenticatedRequest(`{"rating":4,"message":"I like the review flow.","page_url":"https://app.test/videos"}`)
	rec := httptest.NewRecorder()

	h.Create(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	if !store.created {
		t.Fatal("feedback was not stored")
	}
	if store.createParams.UserID != "user-1" {
		t.Fatalf("stored user %q, want user-1", store.createParams.UserID)
	}
	if store.createParams.UserDisplayName != "Ada Coach" {
		t.Fatalf("stored display name %q, want Ada Coach", store.createParams.UserDisplayName)
	}
	if store.createParams.Rating != 4 || store.createParams.Message != "I like the review flow." {
		t.Fatalf("stored wrong feedback: %+v", store.createParams)
	}
	if discord.channelID != "forum-1" {
		t.Fatalf("posted to channel %q, want forum-1", discord.channelID)
	}
	if !strings.Contains(discord.post.Content, "`user-1`") {
		t.Fatalf("discord post should include internal user id: %s", discord.post.Content)
	}
	if !store.posted || store.postedParams.DiscordThreadID != "thread-1" {
		t.Fatalf("discord success was not persisted: %+v", store.postedParams)
	}

	var response createResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.DiscordStatus != "posted" {
		t.Fatalf("got discord status %q, want posted", response.DiscordStatus)
	}
}

func TestCreateSucceedsWhenDiscordFails(t *testing.T) {
	store := &fakeStore{}
	discord := &fakeDiscord{err: errors.New("discord unavailable")}
	h := NewHandler(store, discord, testLogger(), HandlerConfig{DiscordChannelID: "forum-1"})
	req := authenticatedRequest(`{"rating":2,"message":"Something felt slow."}`)
	rec := httptest.NewRecorder()

	h.Create(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	if !store.failed {
		t.Fatal("discord failure was not persisted")
	}

	var response createResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.DiscordStatus != "failed" {
		t.Fatalf("got discord status %q, want failed", response.DiscordStatus)
	}
}

func TestCreateSkipsDiscordWhenNotConfigured(t *testing.T) {
	store := &fakeStore{}
	h := NewHandler(store, nil, testLogger(), HandlerConfig{DiscordChannelID: "forum-1"})
	req := authenticatedRequest(`{"rating":5,"message":"Helpful."}`)
	rec := httptest.NewRecorder()

	h.Create(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	if !store.skipped {
		t.Fatal("discord skip was not persisted")
	}
}

type fakeStore struct {
	created       bool
	createParams  db.CreateFeedbackSubmissionParams
	posted        bool
	postedParams  db.MarkFeedbackDiscordPostedParams
	failed        bool
	failedParams  db.MarkFeedbackDiscordFailedParams
	skipped       bool
	skippedParams db.MarkFeedbackDiscordSkippedParams
}

func (s *fakeStore) CreateFeedbackSubmission(_ context.Context, arg db.CreateFeedbackSubmissionParams) (db.FeedbackSubmission, error) {
	s.created = true
	s.createParams = arg
	return db.FeedbackSubmission{
		ID:               testUUID(),
		UserID:           arg.UserID,
		UserDisplayName:  arg.UserDisplayName,
		Rating:           arg.Rating,
		Message:          arg.Message,
		PageUrl:          arg.PageUrl,
		UserAgent:        arg.UserAgent,
		DiscordChannelID: arg.DiscordChannelID,
	}, nil
}

func (s *fakeStore) MarkFeedbackDiscordPosted(_ context.Context, arg db.MarkFeedbackDiscordPostedParams) error {
	s.posted = true
	s.postedParams = arg
	return nil
}

func (s *fakeStore) MarkFeedbackDiscordFailed(_ context.Context, arg db.MarkFeedbackDiscordFailedParams) error {
	s.failed = true
	s.failedParams = arg
	return nil
}

func (s *fakeStore) MarkFeedbackDiscordSkipped(_ context.Context, arg db.MarkFeedbackDiscordSkippedParams) error {
	s.skipped = true
	s.skippedParams = arg
	return nil
}

type fakeDiscord struct {
	channelID string
	post      discord.Post
	thread    discord.Thread
	err       error
}

func (d *fakeDiscord) CreateForumPost(_ context.Context, channelID string, post discord.Post) (discord.Thread, error) {
	d.channelID = channelID
	d.post = post
	if d.err != nil {
		return discord.Thread{}, d.err
	}
	return d.thread, nil
}

func authenticatedRequest(body string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/feedback", bytes.NewBufferString(body))
	req.Header.Set("User-Agent", "feedback-test")
	ctx := context.WithValue(req.Context(), auth.UserKey, &auth.UserContext{
		ID:        "user-1",
		FirstName: "Ada",
		LastName:  "Coach",
	})
	return req.WithContext(ctx)
}

func testUUID() pgtype.UUID {
	return pgtype.UUID{Bytes: [16]byte{0x9a, 0x02, 0x57, 0x76, 0x67, 0x91, 0x45, 0xc8, 0x90, 0x7f, 0x09, 0xe6, 0x50, 0x58, 0x74, 0x7a}, Valid: true}
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}
