package groups

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
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

func testUserCtx(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func adminUser() *auth.UserContext {
	return &auth.UserContext{
		ID:          "user-1",
		Email:       "admin@test.com",
		FirstName:   "Admin",
		LastName:    "User",
		Role:        "admin",
		Permissions: []string{permissions.GroupsRead, permissions.GroupsCreate},
	}
}

func TestListGroups_Unauthorized(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	req := httptest.NewRequest(http.MethodGet, "/groups", nil)
	rec := httptest.NewRecorder()

	h.ListGroups(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestListGroups_Forbidden(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	user := &auth.UserContext{ID: "user-1", Role: "viewer", Permissions: []string{}}
	req := httptest.NewRequest(http.MethodGet, "/groups", nil)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListGroups(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestListGroups_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	now := time.Now()
	uuid := pgtype.UUID{Valid: true}
	copy(uuid.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	q.EXPECT().ListUserGroups(gomock.Any(), "user-1").Return([]db.ListUserGroupsRow{
		{
			ID:          uuid,
			Name:        "Test Group",
			OwnerID:     "user-1",
			Description: "desc",
			CreatedAt:   pgtype.Timestamptz{Time: now, Valid: true},
			UpdatedAt:   pgtype.Timestamptz{Time: now, Valid: true},
		},
	}, nil)

	user := adminUser()
	req := httptest.NewRequest(http.MethodGet, "/groups", nil)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListGroups(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var groups []groupResponse
	if err := json.NewDecoder(rec.Body).Decode(&groups); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("got %d groups, want 1", len(groups))
	}
	if groups[0].Name != "Test Group" {
		t.Errorf("got name %q, want %q", groups[0].Name, "Test Group")
	}
}

func TestListGroups_DBError(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().ListUserGroups(gomock.Any(), "user-1").Return(nil, errors.New("db down"))

	user := adminUser()
	req := httptest.NewRequest(http.MethodGet, "/groups", nil)
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.ListGroups(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("got %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestCreateGroup_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	now := time.Now()
	uuid := pgtype.UUID{Valid: true}
	copy(uuid.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	q.EXPECT().CreateGroup(gomock.Any(), db.CreateGroupParams{
		Name:        "New Group",
		OwnerID:     "user-1",
		Avatar:      "base64data",
		Description: "A new group",
	}).Return(db.Group{
		ID:          uuid,
		Name:        "New Group",
		OwnerID:     "user-1",
		Avatar:      "base64data",
		Description: "A new group",
		CreatedAt:   pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:   pgtype.Timestamptz{Time: now, Valid: true},
	}, nil)

	q.EXPECT().AddUserToGroup(gomock.Any(), db.AddUserToGroupParams{
		UserID:  "user-1",
		GroupID: uuid,
	}).Return(nil)

	body := `{"name":"New Group","description":"A new group","avatar":"base64data"}`
	user := adminUser()
	req := httptest.NewRequest(http.MethodPost, "/groups", strings.NewReader(body))
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateGroup(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var resp groupResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Name != "New Group" {
		t.Errorf("got name %q, want %q", resp.Name, "New Group")
	}
}

func TestCreateGroup_MissingName(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	body := `{"name":"","description":"desc","avatar":"base64data"}`
	user := adminUser()
	req := httptest.NewRequest(http.MethodPost, "/groups", strings.NewReader(body))
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateGroup(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestCreateGroup_MissingAvatar(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	body := `{"name":"Group","description":"desc","avatar":""}`
	user := adminUser()
	req := httptest.NewRequest(http.MethodPost, "/groups", strings.NewReader(body))
	req = req.WithContext(testUserCtx(req.Context(), user))
	rec := httptest.NewRecorder()

	h.CreateGroup(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}
