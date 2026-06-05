package reviews

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	llmmocks "github.com/OZIOisgood/zeta/internal/llm/mocks"
	"github.com/OZIOisgood/zeta/internal/notifications"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

// createReviewReRootedMatcher checks that a CreateVideoReviewParams is re-rooted
// to the expected parent and carries no timestamp.
type createReviewReRootedMatcher struct {
	wantParentID pgtype.UUID
}

func (m createReviewReRootedMatcher) Matches(x interface{}) bool {
	p, ok := x.(db.CreateVideoReviewParams)
	return ok && p.ParentID == m.wantParentID && !p.TimestampSeconds.Valid
}

func (m createReviewReRootedMatcher) String() string {
	return "re-rooted CreateVideoReviewParams with no timestamp"
}

func makeListRow(id, videoID pgtype.UUID, content string, ts *int32, parentID *pgtype.UUID, firstName, lastName string) db.ListVideoReviewsRow {
	row := db.ListVideoReviewsRow{
		ID:        id,
		VideoID:   videoID,
		Content:   content,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	if ts != nil {
		row.TimestampSeconds = pgtype.Int4{Int32: *ts, Valid: true}
	}
	if parentID != nil {
		row.ParentID = *parentID
	}
	if firstName != "" {
		row.AuthorFirstName = pgtype.Text{String: firstName, Valid: true}
	}
	if lastName != "" {
		row.AuthorLastName = pgtype.Text{String: lastName, Valid: true}
	}
	return row
}

func testUserCtx(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func withChiURLParam(r *http.Request, key, value string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

func reviewUser() *auth.UserContext {
	return &auth.UserContext{
		ID:          "user-1",
		Email:       "reviewer@test.com",
		FirstName:   "Review",
		LastName:    "User",
		Role:        "admin",
		Permissions: []string{permissions.ReviewsRead, permissions.ReviewsCreate},
	}
}

func testUUID() pgtype.UUID {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	return u
}

func expectVideoVisible(q *dbmocks.MockQuerier, videoID pgtype.UUID, user *auth.UserContext) {
	q.EXPECT().CheckVideoVisibleToUser(gomock.Any(), db.CheckVideoVisibleToUserParams{
		VideoID:   videoID,
		IsStudent: user.Role == permissions.RoleStudent,
		UserID:    user.ID,
	}).Return(true, nil)
}

func TestListReviews_Unauthorized(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	req := httptest.NewRequest(http.MethodGet, "/videos/abc/reviews", nil)
	req = withChiURLParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestListReviews_Forbidden(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	user := &auth.UserContext{ID: "user-1", Permissions: []string{}}
	req := httptest.NewRequest(http.MethodGet, "/videos/abc/reviews", nil)
	req = withChiURLParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestListReviews_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	now := time.Now()
	reviewID := pgtype.UUID{Valid: true}
	copy(reviewID.Bytes[:], []byte{16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1})

	user := reviewUser()
	expectVideoVisible(q, videoID, user)
	q.EXPECT().ListVideoReviews(gomock.Any(), videoID).Return([]db.ListVideoReviewsRow{
		{
			ID:               reviewID,
			VideoID:          videoID,
			Content:          "Great form!",
			TimestampSeconds: pgtype.Int4{Int32: 30, Valid: true},
			CreatedAt:        pgtype.Timestamptz{Time: now, Valid: true},
		},
	}, nil)

	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"
	req := httptest.NewRequest(http.MethodGet, "/videos/"+videoIDStr+"/reviews", nil)
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var reviews []ReviewResponse
	if err := json.NewDecoder(rec.Body).Decode(&reviews); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(reviews) != 1 {
		t.Fatalf("got %d reviews, want 1", len(reviews))
	}
	if reviews[0].Content != "Great form!" {
		t.Errorf("got content %q, want %q", reviews[0].Content, "Great form!")
	}
}

func TestListReviews_NotVisible(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	user := reviewUser()
	q.EXPECT().CheckVideoVisibleToUser(gomock.Any(), db.CheckVideoVisibleToUserParams{
		VideoID:   videoID,
		IsStudent: false,
		UserID:    user.ID,
	}).Return(false, nil)

	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"
	req := httptest.NewRequest(http.MethodGet, "/videos/"+videoIDStr+"/reviews", nil)
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("got %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestListReviews_InvalidVideoID(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	user := reviewUser()
	req := httptest.NewRequest(http.MethodGet, "/videos/not-a-uuid/reviews", nil)
	req = withChiURLParam(req, "id", "not-a-uuid")
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestCreateReview_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	reviewID := pgtype.UUID{Valid: true}
	copy(reviewID.Bytes[:], []byte{16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1})
	now := time.Now()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	user := reviewUser()
	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-1").Return(db.UserPreference{
		FirstName: "Review",
		LastName:  "User",
	}, nil)
	q.EXPECT().CreateVideoReview(gomock.Any(), gomock.Any()).Return(db.VideoReview{
		ID:        reviewID,
		VideoID:   videoID,
		Content:   "Nice technique",
		CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
	}, nil)

	// Background video_reviewed notification: empty owner short-circuits before
	// any CreateNotification. AnyTimes tolerates the detached goroutine timing.
	q.EXPECT().GetAssetOwnerByVideoID(gomock.Any(), gomock.Any()).Return(db.GetAssetOwnerByVideoIDRow{}, nil).AnyTimes()

	body := `{"content":"Nice technique"}`
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["content"] != "Nice technique" {
		t.Errorf("got content %q, want %q", resp["content"], "Nice technique")
	}
}

func TestCreateReview_NotifiesVideoOwner(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	assetID := pgtype.UUID{Valid: true}
	copy(assetID.Bytes[:], []byte{1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1})
	reviewID := pgtype.UUID{Valid: true}
	copy(reviewID.Bytes[:], []byte{16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1})
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	user := reviewUser() // author id "user-1"
	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-1").Return(db.UserPreference{
		FirstName: "Review",
		LastName:  "User",
	}, nil)
	q.EXPECT().CreateVideoReview(gomock.Any(), gomock.Any()).Return(db.VideoReview{
		ID:        reviewID,
		VideoID:   videoID,
		Content:   "Nice technique",
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}, nil)
	// Owner (student) differs from the reviewer, so a notification must be recorded.
	q.EXPECT().GetAssetOwnerByVideoID(gomock.Any(), gomock.Any()).Return(db.GetAssetOwnerByVideoIDRow{
		AssetID:   assetID,
		OwnerID:   "student-1",
		Name:      "Backhand drill",
		GroupName: "Academy",
	}, nil).AnyTimes()

	recorded := make(chan db.CreateNotificationParams, 1)
	q.EXPECT().CreateNotification(gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, arg db.CreateNotificationParams) (db.Notification, error) {
			recorded <- arg
			return db.Notification{}, nil
		}).Times(1)

	body := `{"content":"Nice technique"}`
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}

	select {
	case arg := <-recorded:
		if arg.RecipientID != "student-1" {
			t.Fatalf("recipient = %q, want student-1", arg.RecipientID)
		}
		if arg.Type != db.NotificationType(notifications.TypeVideoReviewed) {
			t.Fatalf("type = %q, want %q", arg.Type, notifications.TypeVideoReviewed)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("CreateNotification was not called for the video owner")
	}
}

func TestCreateReview_CompletedAsset(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	user := reviewUser()
	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusCompleted, nil)

	body := `{"content":"Too late"}`
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestCreateReview_EmptyContent(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	user := reviewUser()
	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)

	body := `{"content":""}`
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestCreateReview_AuthorPreferencesMissing(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	user := reviewUser()
	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-1").Return(db.UserPreference{}, errors.New("missing preferences"))

	body := `{"content":"Good content"}`
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("got %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestCreateReview_DBError(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	user := reviewUser()
	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-1").Return(db.UserPreference{
		FirstName: "Review",
		LastName:  "User",
	}, nil)
	q.EXPECT().CreateVideoReview(gomock.Any(), gomock.Any()).Return(db.VideoReview{}, errors.New("db error"))

	body := `{"content":"Good content"}`
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("got %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestListReviews_ReturnsAuthorAndParentID(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	user := reviewUser()
	videoID := testUUID()
	replyUUID := pgtype.UUID{Valid: true}
	copy(replyUUID.Bytes[:], []byte{2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	ts := int32(10)
	rows := []db.ListVideoReviewsRow{
		makeListRow(videoID, videoID, "Root comment", &ts, nil, "Anna", "Müller"),
		makeListRow(replyUUID, videoID, "Reply text", nil, &videoID, "Ben", "Smith"),
	}

	expectVideoVisible(q, videoID, user)
	q.EXPECT().ListVideoReviews(gomock.Any(), videoID).Return(rows, nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = withChiURLParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200: %s", rec.Code, rec.Body.String())
	}

	var got []ReviewResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}

	if len(got) != 2 {
		t.Fatalf("got %d reviews, want 2", len(got))
	}
	if got[0].Author == nil || got[0].Author.Name != "Anna Müller" {
		t.Errorf("root author name: got %v, want 'Anna Müller'", got[0].Author)
	}
	if got[1].ParentID == nil {
		t.Error("reply should have parent_id set")
	}
	if got[1].TimestampSeconds != nil {
		t.Error("reply should not have timestamp_seconds")
	}
}

func TestListReviews_AuthorProfileMissingIsError(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	user := reviewUser()
	videoID := testUUID()
	reviewID := testUUID()
	rows := []db.ListVideoReviewsRow{
		{
			ID:        reviewID,
			VideoID:   videoID,
			Content:   "Own comment",
			AuthorID:  pgtype.Text{String: user.ID, Valid: true},
			CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		},
	}

	expectVideoVisible(q, videoID, user)
	q.EXPECT().ListVideoReviews(gomock.Any(), videoID).Return(rows, nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = withChiURLParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListReviews(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got %d, want 500: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateReview_Reply_ReRootsToTopLevel(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	user := &auth.UserContext{
		ID:          "user-1",
		FirstName:   "Anna",
		LastName:    "Müller",
		Role:        "admin",
		Permissions: []string{permissions.ReviewsCreate, permissions.ReviewsRead},
	}

	videoID := testUUID()
	rootUUID := pgtype.UUID{Valid: true}
	copy(rootUUID.Bytes[:], []byte{2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	replyUUID := pgtype.UUID{Valid: true}
	copy(replyUUID.Bytes[:], []byte{3, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)

	// Parent is itself a reply (has parent_id = rootUUID)
	q.EXPECT().GetVideoReview(gomock.Any(), replyUUID).Return(db.GetVideoReviewRow{
		ID:       replyUUID,
		VideoID:  videoID,
		ParentID: rootUUID, // already a reply
	}, nil)

	// Expect insert re-rooted to rootUUID (not replyUUID), with no timestamp
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-1").Return(db.UserPreference{
		FirstName: "Anna",
		LastName:  "Müller",
	}, nil)
	q.EXPECT().CreateVideoReview(gomock.Any(), createReviewReRootedMatcher{wantParentID: rootUUID}).Return(db.VideoReview{
		ID:        videoID,
		Content:   "reply content",
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}, nil)
	q.EXPECT().GetAssetOwnerByVideoID(gomock.Any(), gomock.Any()).Return(db.GetAssetOwnerByVideoIDRow{}, nil).AnyTimes()

	replyIDStr := "03030304-0506-0708-090a-0b0c0d0e0f10"
	body := `{"content":"reply content","parent_id":"` + replyIDStr + `","timestamp_seconds":42}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req = withChiURLParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got %d, want 201: %s", rec.Code, rec.Body.String())
	}
	var resp map[string]interface{}
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if _, hasTS := resp["timestamp_seconds"]; hasTS {
		t.Error("reply response must not contain timestamp_seconds")
	}
}

func TestCreateReview_Reply_CrossVideoRejected(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	user := &auth.UserContext{
		ID:          "user-1",
		Role:        "admin",
		Permissions: []string{permissions.ReviewsCreate},
	}
	videoID := testUUID()
	otherVideoID := pgtype.UUID{Valid: true}
	copy(otherVideoID.Bytes[:], []byte{9, 9, 9, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	parentUUID := pgtype.UUID{Valid: true}
	copy(parentUUID.Bytes[:], []byte{2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	expectVideoVisible(q, videoID, user)
	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().GetVideoReview(gomock.Any(), parentUUID).Return(db.GetVideoReviewRow{
		ID:      parentUUID,
		VideoID: otherVideoID, // different video!
	}, nil)

	parentIDStr := "02020304-0506-0708-090a-0b0c0d0e0f10"
	body := `{"content":"reply","parent_id":"` + parentIDStr + `"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req = withChiURLParam(req, "id", "01020304-0506-0708-090a-0b0c0d0e0f10")
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", rec.Code)
	}
}
