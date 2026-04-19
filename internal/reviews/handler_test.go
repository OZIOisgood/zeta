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
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

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
		Role:        "admin",
		Permissions: []string{permissions.ReviewsRead, permissions.ReviewsCreate},
	}
}

func testUUID() pgtype.UUID {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	return u
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

	q.EXPECT().ListVideoReviews(gomock.Any(), videoID).Return([]db.VideoReview{
		{
			ID:               reviewID,
			VideoID:          videoID,
			Content:          "Great form!",
			TimestampSeconds: pgtype.Int4{Int32: 30, Valid: true},
			CreatedAt:        pgtype.Timestamptz{Time: now, Valid: true},
		},
	}, nil)

	user := reviewUser()
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

	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().CreateVideoReview(gomock.Any(), gomock.Any()).Return(db.VideoReview{
		ID:        reviewID,
		VideoID:   videoID,
		Content:   "Nice technique",
		CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
	}, nil)

	body := `{"content":"Nice technique"}`
	user := reviewUser()
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

func TestCreateReview_CompletedAsset(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusCompleted, nil)

	body := `{"content":"Too late"}`
	user := reviewUser()
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

	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)

	body := `{"content":""}`
	user := reviewUser()
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestCreateReview_DBError(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	llmMock := llmmocks.NewMockEnhancer(ctrl)
	h := NewHandler(q, slog.Default(), llmMock)

	videoID := testUUID()
	videoIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"

	q.EXPECT().GetAssetStatusByVideoID(gomock.Any(), videoID).Return(db.AssetStatusPending, nil)
	q.EXPECT().CreateVideoReview(gomock.Any(), gomock.Any()).Return(db.VideoReview{}, errors.New("db error"))

	body := `{"content":"Good content"}`
	user := reviewUser()
	req := httptest.NewRequest(http.MethodPost, "/videos/"+videoIDStr+"/reviews", strings.NewReader(body))
	req = withChiURLParam(req, "id", videoIDStr)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateReview(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("got %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}
