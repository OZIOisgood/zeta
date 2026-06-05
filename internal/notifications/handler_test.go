package notifications

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

func testUserCtx(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, auth.UserKey, &auth.UserContext{ID: id})
}

func newTestHandler(t *testing.T) (*Handler, *dbmocks.MockQuerier) {
	t.Helper()
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	return NewHandler(q, NewHub(), slog.New(slog.NewTextHandler(io.Discard, nil))), q
}

func TestListReturnsItemsAndUnreadCount(t *testing.T) {
	h, q := newTestHandler(t)

	var id pgtype.UUID
	_ = id.Scan("11111111-1111-1111-1111-111111111111")
	rows := []db.Notification{{
		ID:          id,
		RecipientID: "user-1",
		Type:        db.NotificationTypeVideoUploaded,
		Payload:     []byte(`{"asset_id":"a1","video_title":"My clip"}`),
		CreatedAt:   pgtype.Timestamptz{Valid: true},
	}}

	q.EXPECT().ListNotifications(gomock.Any(), db.ListNotificationsParams{RecipientID: "user-1", Limit: listLimit}).Return(rows, nil)
	q.EXPECT().CountUnreadNotifications(gomock.Any(), "user-1").Return(int64(1), nil)

	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	req = req.WithContext(testUserCtx(req.Context(), "user-1"))
	rec := httptest.NewRecorder()

	h.List(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var resp struct {
		Items []struct {
			ID      string          `json:"id"`
			Type    string          `json:"type"`
			Payload json.RawMessage `json:"payload"`
			Read    bool            `json:"read"`
		} `json:"items"`
		UnreadCount int64 `json:"unread_count"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.UnreadCount != 1 {
		t.Fatalf("unread_count = %d, want 1", resp.UnreadCount)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("items len = %d, want 1", len(resp.Items))
	}
	if resp.Items[0].Type != "video_uploaded" {
		t.Fatalf("type = %q, want video_uploaded", resp.Items[0].Type)
	}
	if resp.Items[0].Read {
		t.Fatal("expected unread item")
	}
}

func TestListEnrichesInvitationStatus(t *testing.T) {
	h, q := newTestHandler(t)

	var id pgtype.UUID
	_ = id.Scan("22222222-2222-2222-2222-222222222222")
	rows := []db.Notification{{
		ID:          id,
		RecipientID: "user-1",
		Type:        db.NotificationTypeGroupInvitationReceived,
		Payload:     []byte(`{"group_name":"Academy","code":"ZP-1"}`),
		CreatedAt:   pgtype.Timestamptz{Valid: true},
	}}

	q.EXPECT().ListNotifications(gomock.Any(), db.ListNotificationsParams{RecipientID: "user-1", Limit: listLimit}).Return(rows, nil)
	q.EXPECT().CountUnreadNotifications(gomock.Any(), "user-1").Return(int64(1), nil)
	// The referenced invitation was already accepted — the client should hide the
	// accept/decline actions for this row.
	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "ZP-1").
		Return(db.GroupInvitation{Status: db.InvitationStatusAccepted}, nil)

	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	req = req.WithContext(testUserCtx(req.Context(), "user-1"))
	rec := httptest.NewRecorder()

	h.List(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var resp struct {
		Items []struct {
			Type         string `json:"type"`
			InviteStatus string `json:"invite_status"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("items len = %d, want 1", len(resp.Items))
	}
	if resp.Items[0].InviteStatus != "accepted" {
		t.Fatalf("invite_status = %q, want accepted", resp.Items[0].InviteStatus)
	}
}

func TestListUnauthorized(t *testing.T) {
	h, _ := newTestHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	rec := httptest.NewRecorder()

	h.List(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestMarkReadScopedToRecipient(t *testing.T) {
	h, q := newTestHandler(t)

	idStr := "22222222-2222-2222-2222-222222222222"
	var id pgtype.UUID
	_ = id.Scan(idStr)

	q.EXPECT().MarkNotificationRead(gomock.Any(), db.MarkNotificationReadParams{ID: id, RecipientID: "user-1"}).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/notifications/"+idStr+"/read", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", idStr)
	req = req.WithContext(context.WithValue(testUserCtx(req.Context(), "user-1"), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()

	h.MarkRead(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
}

func TestMarkReadInvalidID(t *testing.T) {
	h, _ := newTestHandler(t)

	req := httptest.NewRequest(http.MethodPost, "/notifications/not-a-uuid/read", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(testUserCtx(req.Context(), "user-1"), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()

	h.MarkRead(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestMarkAllRead(t *testing.T) {
	h, q := newTestHandler(t)

	q.EXPECT().MarkAllNotificationsRead(gomock.Any(), "user-1").Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/notifications/read-all", nil)
	req = req.WithContext(testUserCtx(req.Context(), "user-1"))
	rec := httptest.NewRecorder()

	h.MarkAllRead(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
}
