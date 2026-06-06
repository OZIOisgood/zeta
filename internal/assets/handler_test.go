package assets

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/assets/mocks"
	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	muxgo "github.com/muxinc/mux-go"
	"go.uber.org/mock/gomock"
)

func assetTestUserCtx(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func assetWithChiURLParam(r *http.Request, key, value string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

func assetTestUUID() pgtype.UUID {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	return u
}

func TestListAssets_StudentUsesOwnerVisibilityScope(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	user := &auth.UserContext{ID: "student-1", Role: permissions.RoleStudent}
	assetID := assetTestUUID()
	q.EXPECT().ListVisibleAssets(gomock.Any(), db.ListVisibleAssetsParams{
		UserID:    user.ID,
		IsStudent: true,
	}).Return([]db.ListVisibleAssetsRow{
		{
			ID:          assetID,
			Name:        "Own Video",
			Description: "student asset",
			Status:      db.AssetStatusPending,
			OwnerID:     user.ID,
			PlaybackID:  "playback-1",
			ReviewCount: 2,
		},
	}, nil)

	req := httptest.NewRequest(http.MethodGet, "/assets", nil)
	req = req.WithContext(assetTestUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListAssets(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	var resp []AssetItem
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp) != 1 || resp[0].OwnerID != user.ID {
		t.Fatalf("got %+v, want one owned asset", resp)
	}
	if resp[0].ReviewCount != 2 {
		t.Fatalf("got review_count %d, want 2", resp[0].ReviewCount)
	}
}

func TestListAssets_ExpertUsesGroupMembershipVisibilityScope(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	user := &auth.UserContext{ID: "expert-1", Role: permissions.RoleExpert}
	q.EXPECT().ListVisibleAssets(gomock.Any(), db.ListVisibleAssetsParams{
		UserID:    user.ID,
		IsStudent: false,
	}).Return([]db.ListVisibleAssetsRow{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/assets", nil)
	req = req.WithContext(assetTestUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListAssets(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
}

func TestListAssets_AdminUsesGroupMembershipVisibilityScope(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	user := &auth.UserContext{ID: "admin-1", Role: permissions.RoleAdmin}
	q.EXPECT().ListVisibleAssets(gomock.Any(), db.ListVisibleAssetsParams{
		UserID:    user.ID,
		IsStudent: false,
	}).Return([]db.ListVisibleAssetsRow{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/assets", nil)
	req = req.WithContext(assetTestUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListAssets(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
}

func TestGetAsset_NotVisibleReturnsNotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	user := &auth.UserContext{ID: "student-1", Role: permissions.RoleStudent}
	assetID := assetTestUUID()
	assetIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"
	q.EXPECT().GetVisibleAsset(gomock.Any(), db.GetVisibleAssetParams{
		AssetID:   assetID,
		UserID:    user.ID,
		IsStudent: true,
	}).Return(db.GetVisibleAssetRow{}, pgx.ErrNoRows)

	req := httptest.NewRequest(http.MethodGet, "/assets/"+assetIDStr, nil)
	req = assetWithChiURLParam(req, "id", assetIDStr)
	req = req.WithContext(assetTestUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.GetAsset(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestFinalizeAsset_NotVisibleReturnsNotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	user := &auth.UserContext{
		ID:          "expert-1",
		Role:        permissions.RoleExpert,
		Permissions: []string{permissions.AssetsFinalize},
	}
	assetID := assetTestUUID()
	assetIDStr := "01020304-0506-0708-090a-0b0c0d0e0f10"
	q.EXPECT().GetVisibleAsset(gomock.Any(), db.GetVisibleAssetParams{
		AssetID:   assetID,
		UserID:    user.ID,
		IsStudent: false,
	}).Return(db.GetVisibleAssetRow{}, pgx.ErrNoRows)

	req := httptest.NewRequest(http.MethodPost, "/assets/"+assetIDStr+"/finalize", nil)
	req = assetWithChiURLParam(req, "id", assetIDStr)
	req = req.WithContext(assetTestUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.FinalizeAsset(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestBackfillVideoDurations_RejectsWithoutSecret(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "scheduler-secret")

	req := httptest.NewRequest(http.MethodPost, "/internal/assets/durations/backfill", nil)
	req.Header.Set("Authorization", "Bearer wrong")
	rec := httptest.NewRecorder()

	h.BackfillVideoDurations(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestBackfillVideoDurations_UpdatesMissingDurations(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	mux := mocks.NewMockMuxClient(ctrl)
	h := NewHandler(q, mux, nil, nil, slog.Default(), "scheduler-secret")

	videoID := assetTestUUID()
	q.EXPECT().ListVideosMissingDuration(gomock.Any(), int32(100)).Return([]db.ListVideosMissingDurationRow{
		{ID: videoID, MuxAssetID: pgtype.Text{String: "mux-asset-1", Valid: true}},
	}, nil)
	mux.EXPECT().GetAsset("mux-asset-1").Return(muxgo.AssetResponse{
		Data: muxgo.Asset{Duration: 42.5},
	}, nil)
	q.EXPECT().SetVideoDurationByID(gomock.Any(), db.SetVideoDurationByIDParams{
		ID:              videoID,
		DurationSeconds: pgtype.Float8{Float64: 42.5, Valid: true},
	}).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/internal/assets/durations/backfill", nil)
	req.Header.Set("Authorization", "Bearer scheduler-secret")
	rec := httptest.NewRecorder()

	h.BackfillVideoDurations(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusOK)
	}
	var resp struct {
		Updated int  `json:"updated"`
		HasMore bool `json:"has_more"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Updated != 1 {
		t.Fatalf("got updated=%d, want 1", resp.Updated)
	}
}

// Direct uploads carry only mux_upload_id (mux_asset_id stays empty), so the
// backfill must resolve duration via the upload's backing asset.
func TestBackfillVideoDurations_ResolvesViaUploadID(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	mux := mocks.NewMockMuxClient(ctrl)
	h := NewHandler(q, mux, nil, nil, slog.Default(), "scheduler-secret")

	videoID := assetTestUUID()
	q.EXPECT().ListVideosMissingDuration(gomock.Any(), int32(100)).Return([]db.ListVideosMissingDurationRow{
		{ID: videoID, MuxUploadID: pgtype.Text{String: "upload-1", Valid: true}},
	}, nil)
	mux.EXPECT().GetDirectUpload("upload-1").Return(muxgo.UploadResponse{
		Data: muxgo.Upload{AssetId: "mux-asset-7"},
	}, nil)
	mux.EXPECT().GetAsset("mux-asset-7").Return(muxgo.AssetResponse{
		Data: muxgo.Asset{Duration: 90},
	}, nil)
	q.EXPECT().SetVideoDurationByID(gomock.Any(), db.SetVideoDurationByIDParams{
		ID:              videoID,
		DurationSeconds: pgtype.Float8{Float64: 90, Valid: true},
	}).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/internal/assets/durations/backfill", nil)
	req.Header.Set("Authorization", "Bearer scheduler-secret")
	rec := httptest.NewRecorder()

	h.BackfillVideoDurations(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusOK)
	}
	var resp struct {
		Updated int  `json:"updated"`
		HasMore bool `json:"has_more"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Updated != 1 {
		t.Fatalf("got updated=%d, want 1", resp.Updated)
	}
}
