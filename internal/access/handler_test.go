package access

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	authmocks "github.com/OZIOisgood/zeta/internal/auth/mocks"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/jackc/pgx/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"go.uber.org/mock/gomock"
)

type fakeRefresher struct{ called bool }

func (f *fakeRefresher) RefreshSessionCookies(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	f.called = true
	return nil
}

func redeemRequestFor(userID, role, code string) *http.Request {
	body, _ := json.Marshal(map[string]string{"code": code})
	req := httptest.NewRequest(http.MethodPost, "/access/redeem", bytes.NewReader(body))
	return req.WithContext(context.WithValue(req.Context(), auth.UserKey, &auth.UserContext{ID: userID, Role: role, Permissions: []string{}}))
}

func TestRedeemExpertCodeUpgradesRole(t *testing.T) {
	t.Setenv("DEFAULT_ORG_ID", "org_123")
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	ref := &fakeRefresher{}

	q.EXPECT().GetUserAccess(gomock.Any(), "user_new").Return(db.UserAccess{UserID: "user_new", Status: db.AccessStatusWaitlisted}, nil)
	q.EXPECT().ConsumeSignupCode(gomock.Any(), gomock.Any()).Return(db.SignupCode{Code: "EXPERT01"}, nil)
	workos.EXPECT().ListOrganizationMemberships(gomock.Any(), gomock.Any()).Return(
		usermanagement.ListOrganizationMembershipsResponse{Data: []usermanagement.OrganizationMembership{{ID: "om_1"}}}, nil)
	workos.EXPECT().UpdateOrganizationMembership(gomock.Any(), "om_1", usermanagement.UpdateOrganizationMembershipOpts{RoleSlug: permissions.RoleExpert}).Return(usermanagement.OrganizationMembership{}, nil)
	q.EXPECT().ActivateUserAccess(gomock.Any(), gomock.Any()).Return(db.UserAccess{Status: db.AccessStatusActive}, nil)

	h := NewHandler(q, workos, ref, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor("user_new", permissions.RoleStudent, "EXPERT01"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["role"] != "expert" || body["role_upgraded"] != true {
		t.Fatalf("body = %v, want expert/role_upgraded", body)
	}
	if !ref.called {
		t.Fatal("expected session refresh after role upgrade")
	}
}

func TestRedeemGroupCodeActivatesStudent(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)

	q.EXPECT().GetUserAccess(gomock.Any(), "user_s").Return(db.UserAccess{Status: db.AccessStatusWaitlisted}, nil)
	q.EXPECT().ConsumeSignupCode(gomock.Any(), gomock.Any()).Return(db.SignupCode{}, pgx.ErrNoRows)
	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "GRP123").Return(db.GroupInvitation{}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), gomock.Any()).Return(false, nil)
	q.EXPECT().AddUserToGroup(gomock.Any(), gomock.Any()).Return(nil)
	q.EXPECT().ActivateUserAccess(gomock.Any(), gomock.Any()).Return(db.UserAccess{Status: db.AccessStatusActive}, nil)

	h := NewHandler(q, workos, &fakeRefresher{}, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor("user_s", permissions.RoleStudent, "GRP123"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["role"] != "student" || body["role_upgraded"] != false {
		t.Fatalf("body = %v, want student/no-upgrade", body)
	}
}

func TestRedeemInvalidCodeReturnsNeutralError(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)

	q.EXPECT().GetUserAccess(gomock.Any(), "user_x").Return(db.UserAccess{Status: db.AccessStatusWaitlisted}, nil)
	q.EXPECT().ConsumeSignupCode(gomock.Any(), gomock.Any()).Return(db.SignupCode{}, pgx.ErrNoRows)
	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "NOPE").Return(db.GroupInvitation{}, pgx.ErrNoRows)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor("user_x", permissions.RoleStudent, "NOPE"))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestRedeemAlreadyActiveIsNoOp(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().GetUserAccess(gomock.Any(), "user_a").Return(db.UserAccess{Status: db.AccessStatusActive}, nil)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor("user_a", permissions.RoleExpert, "EXPERT01"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}

func TestListCodesLazilySeedsFiveForExpert(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().CountSignupCodesByOwner(gomock.Any(), "exp_1").Return(int64(0), nil)
	q.EXPECT().CreateSignupCode(gomock.Any(), gomock.Any()).Times(ExpertCodeAllotment).Return(db.SignupCode{}, nil)
	q.EXPECT().ListSignupCodesByOwner(gomock.Any(), "exp_1").Return([]db.SignupCode{
		{Code: "AAAA1111", Status: db.SignupCodeStatusAvailable},
	}, nil)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	req := httptest.NewRequest(http.MethodGet, "/access/codes", nil).
		WithContext(context.WithValue(context.Background(), auth.UserKey, &auth.UserContext{ID: "exp_1", Role: permissions.RoleExpert}))
	rec := httptest.NewRecorder()
	h.ListCodes(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rec.Code, rec.Body.String())
	}
}

func TestGenerateCodesRequiresAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())

	body := bytes.NewReader([]byte(`{"count":3}`))
	req := httptest.NewRequest(http.MethodPost, "/access/codes", body).
		WithContext(context.WithValue(context.Background(), auth.UserKey, &auth.UserContext{ID: "exp_1", Role: permissions.RoleExpert}))
	rec := httptest.NewRecorder()
	h.GenerateCodes(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestGenerateCodesAdminMintsCount(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().CreateSignupCode(gomock.Any(), gomock.Any()).Times(3).Return(db.SignupCode{}, nil)
	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())

	body := bytes.NewReader([]byte(`{"count":3}`))
	req := httptest.NewRequest(http.MethodPost, "/access/codes", body).
		WithContext(context.WithValue(context.Background(), auth.UserKey, &auth.UserContext{ID: "adm_1", Role: permissions.RoleAdmin}))
	rec := httptest.NewRecorder()
	h.GenerateCodes(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", rec.Code)
	}
}

func TestRequireActiveAccessBlocksWaitlisted(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().GetUserAccess(gomock.Any(), "wl_1").Return(db.UserAccess{Status: db.AccessStatusWaitlisted}, nil)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	req := httptest.NewRequest(http.MethodGet, "/groups", nil).
		WithContext(context.WithValue(context.Background(), auth.UserKey, &auth.UserContext{ID: "wl_1", Role: permissions.RoleStudent}))
	rec := httptest.NewRecorder()
	h.RequireActiveAccess(next).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestRequireActiveAccessAllowsActiveAndAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().GetUserAccess(gomock.Any(), "act_1").Return(db.UserAccess{Status: db.AccessStatusActive}, nil)
	// Admin path makes no DB call (no EXPECT for adm_1).

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	for _, tc := range []struct{ id, role string }{{"act_1", permissions.RoleStudent}, {"adm_1", permissions.RoleAdmin}} {
		req := httptest.NewRequest(http.MethodGet, "/groups", nil).
			WithContext(context.WithValue(context.Background(), auth.UserKey, &auth.UserContext{ID: tc.id, Role: tc.role}))
		rec := httptest.NewRecorder()
		h.RequireActiveAccess(next).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("role %s: status = %d, want 200", tc.role, rec.Code)
		}
	}
}
