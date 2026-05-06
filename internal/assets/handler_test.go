package assets

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
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
	h := NewHandler(q, nil, nil, nil, slog.Default())

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
}

func TestListAssets_ExpertUsesGroupMembershipVisibilityScope(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default())

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
	h := NewHandler(q, nil, nil, nil, slog.Default())

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
	h := NewHandler(q, nil, nil, nil, slog.Default())

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
	h := NewHandler(q, nil, nil, nil, slog.Default())

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
