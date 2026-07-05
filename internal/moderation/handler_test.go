package moderation

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

type fakePoster struct {
	channelID string
	post      discord.Post
}

func (f *fakePoster) CreateForumPost(ctx context.Context, channelID string, post discord.Post) (discord.Thread, error) {
	f.channelID = channelID
	f.post = post
	return discord.Thread{ThreadID: "thread-1", MessageID: "message-1"}, nil
}

type createReportMatcher struct {
	userID        string
	reason        string
	subject       string
	targetID      string
	targetContent string
}

func (m createReportMatcher) Matches(x any) bool {
	p, ok := x.(db.CreateModerationReportParams)
	return ok &&
		p.ReporterUserID == m.userID &&
		p.Reason == m.reason &&
		p.SubjectType == m.subject &&
		p.TargetUserID == m.targetID &&
		p.TargetReviewContent == m.targetContent &&
		p.DiscordChannelID == "forum-1"
}

func (m createReportMatcher) String() string {
	return "CreateModerationReportParams with expected user, subject, reason, target, and Discord channel"
}

func testUUID() pgtype.UUID {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	return u
}

func secondTestUUID() pgtype.UUID {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1})
	return u
}

func withUser(req *http.Request, user *auth.UserContext) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), auth.UserKey, user))
}

func withRouteParam(req *http.Request, key, value string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
}

func reportRow(id, videoID, reviewID pgtype.UUID) db.ModerationReport {
	now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
	return db.ModerationReport{
		ID:                  id,
		ReporterUserID:      "reporter-1",
		ReporterDisplayName: "Report User",
		SubjectType:         "user",
		TargetReviewID:      reviewID,
		TargetVideoID:       videoID,
		TargetUserID:        "target-1",
		TargetDisplayName:   "Target User",
		TargetReviewContent: "Reported comment",
		Reason:              "harassment",
		Status:              "open",
		DiscordStatus:       "pending",
		DiscordChannelID:    "forum-1",
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

func TestCreateReport_ForbiddenWithoutPermission(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, slog.Default(), HandlerConfig{})
	user := &auth.UserContext{ID: "user-1", Permissions: []string{}}
	req := withUser(httptest.NewRequest(http.MethodPost, "/moderation/reports", strings.NewReader(`{}`)), user)
	rec := httptest.NewRecorder()

	h.CreateReport(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestCreateReport_PersistsAndPostsToDiscord(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	poster := &fakePoster{}
	h := NewHandler(q, poster, slog.Default(), HandlerConfig{DiscordChannelID: "forum-1"})
	videoID := testUUID()
	reviewID := secondTestUUID()
	user := &auth.UserContext{
		ID:          "reporter-1",
		FirstName:   "Report",
		LastName:    "User",
		Role:        permissions.RoleStudent,
		Permissions: []string{permissions.ModerationReportsCreate},
	}

	q.EXPECT().GetReviewModerationTarget(gomock.Any(), reviewID).Return(db.GetReviewModerationTargetRow{
		ReviewID:            reviewID,
		VideoID:             videoID,
		TargetUserID:        pgtype.Text{String: "target-1", Valid: true},
		TargetDisplayName:   "Target User",
		TargetReviewContent: "Reported comment",
	}, nil)
	q.EXPECT().CheckVideoVisibleToUser(gomock.Any(), db.CheckVideoVisibleToUserParams{
		VideoID:   videoID,
		UserID:    "reporter-1",
		IsStudent: true,
	}).Return(true, nil)
	row := reportRow(testUUID(), videoID, reviewID)
	q.EXPECT().CreateModerationReport(gomock.Any(), createReportMatcher{
		userID:        "reporter-1",
		reason:        "harassment",
		subject:       "user",
		targetID:      "target-1",
		targetContent: "Reported comment",
	}).Return(row, nil)
	q.EXPECT().MarkModerationReportDiscordPosted(gomock.Any(), db.MarkModerationReportDiscordPostedParams{
		ID:               row.ID,
		DiscordThreadID:  "thread-1",
		DiscordMessageID: "message-1",
	}).Return(nil)

	body := `{"subject_type":"user","video_id":"01020304-0506-0708-090a-0b0c0d0e0f10","review_id":"100f0e0d-0c0b-0a09-0807-060504030201","reason":"harassment","details":"Please review"}`
	req := withUser(httptest.NewRequest(http.MethodPost, "/moderation/reports", strings.NewReader(body)), user)
	rec := httptest.NewRecorder()

	h.CreateReport(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	if poster.channelID != "forum-1" {
		t.Fatalf("posted to channel %q, want forum-1", poster.channelID)
	}
	var resp reportResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.DiscordStatus != "posted" {
		t.Fatalf("got DiscordStatus %q, want posted", resp.DiscordStatus)
	}
	if !strings.Contains(poster.post.Content, "Reported comment") {
		t.Fatalf("Discord post did not include reported comment: %s", poster.post.Content)
	}
}

func TestCreateReport_RejectsSelfReport(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, slog.Default(), HandlerConfig{DiscordChannelID: "forum-1"})
	videoID := testUUID()
	reviewID := secondTestUUID()
	user := &auth.UserContext{
		ID:          "reporter-1",
		Role:        permissions.RoleStudent,
		Permissions: []string{permissions.ModerationReportsCreate},
	}

	q.EXPECT().GetReviewModerationTarget(gomock.Any(), reviewID).Return(db.GetReviewModerationTargetRow{
		ReviewID:          reviewID,
		VideoID:           videoID,
		TargetUserID:      pgtype.Text{String: "reporter-1", Valid: true},
		TargetDisplayName: "Report User",
	}, nil)

	body := `{"subject_type":"review_comment","video_id":"01020304-0506-0708-090a-0b0c0d0e0f10","review_id":"100f0e0d-0c0b-0a09-0807-060504030201","reason":"harassment"}`
	req := withUser(httptest.NewRequest(http.MethodPost, "/moderation/reports", strings.NewReader(body)), user)
	rec := httptest.NewRecorder()

	h.CreateReport(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestUpdateReport_RequiresUpdatePermissionAndSavesStatus(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, slog.Default(), HandlerConfig{})
	reportID := testUUID()
	user := &auth.UserContext{
		ID:          "admin-1",
		Permissions: []string{permissions.ModerationReportsUpdate},
	}
	updated := reportRow(reportID, testUUID(), secondTestUUID())
	updated.Status = "resolved"
	updated.ResolvedByUserID = "admin-1"
	updated.ResolvedAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}

	q.EXPECT().UpdateModerationReportStatus(gomock.Any(), db.UpdateModerationReportStatusParams{
		ID:               reportID,
		Status:           "resolved",
		ResolvedByUserID: "admin-1",
	}).Return(updated, nil)

	req := httptest.NewRequest(http.MethodPatch, "/moderation/reports/01020304-0506-0708-090a-0b0c0d0e0f10", strings.NewReader(`{"status":"resolved"}`))
	req = withUser(req, user)
	req = withRouteParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	rec := httptest.NewRecorder()

	h.UpdateReport(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
}
