package users

import (
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
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/workos/workos-go/v4/pkg/common"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"go.uber.org/mock/gomock"
)

func withTestUser(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func TestListGroupUsersUsesPreferenceAvatar(t *testing.T) {
	t.Setenv("DEFAULT_ORG_ID", "org_test")

	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, nil, workos)

	groupID := "11111111-1111-1111-1111-111111111111"
	var pgGroupID pgtype.UUID
	if err := pgGroupID.Scan(groupID); err != nil {
		t.Fatalf("scan group id: %v", err)
	}

	q.EXPECT().ListGroupMembers(gomock.Any(), pgGroupID).Return([]string{"user-2"}, nil)
	workos.EXPECT().ListOrganizationMemberships(gomock.Any(), gomock.Any()).Return(
		usermanagement.ListOrganizationMembershipsResponse{
			Data: []usermanagement.OrganizationMembership{
				{UserID: "user-2", Role: common.RoleResponse{Slug: "student"}},
			},
		},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-2").Return(
		db.UserPreference{
			UserID:    "user-2",
			FirstName: "Local",
			LastName:  "Expert",
			Username:  "local.e",
			Avatar:    "local-base64-avatar",
		},
		nil,
	)

	router := chi.NewRouter()
	router.Get("/groups/{groupID}/users", h.ListGroupUsers)
	req := httptest.NewRequest(http.MethodGet, "/groups/"+groupID+"/users", nil)
	req = req.WithContext(withTestUser(req.Context(), &auth.UserContext{
		ID:          "user-1",
		Permissions: []string{permissions.GroupsUserListRead},
	}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 1 {
		t.Fatalf("got %d users, want 1", len(body.Data))
	}
	if got := body.Data[0]["avatar"]; got != "local-base64-avatar" {
		t.Fatalf("got avatar %v, want local-base64-avatar", got)
	}
	if got := body.Data[0]["username"]; got != "local.e" {
		t.Fatalf("got username %v, want local.e", got)
	}
	if _, ok := body.Data[0]["first_name"]; ok {
		t.Fatalf("response must not expose first_name: %#v", body.Data[0])
	}
	if _, ok := body.Data[0]["email"]; ok {
		t.Fatalf("response must not expose email: %#v", body.Data[0])
	}
	if _, ok := body.Data[0]["profile_picture_url"]; ok {
		t.Fatalf("response must not expose WorkOS profile_picture_url: %#v", body.Data[0])
	}
}

func TestListGroupUsersMissingPreferencesIsError(t *testing.T) {
	t.Setenv("DEFAULT_ORG_ID", "org_test")

	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, nil, workos)

	groupID := "11111111-1111-1111-1111-111111111111"
	var pgGroupID pgtype.UUID
	if err := pgGroupID.Scan(groupID); err != nil {
		t.Fatalf("scan group id: %v", err)
	}

	q.EXPECT().ListGroupMembers(gomock.Any(), pgGroupID).Return([]string{"user-2"}, nil)
	workos.EXPECT().ListOrganizationMemberships(gomock.Any(), gomock.Any()).Return(
		usermanagement.ListOrganizationMembershipsResponse{
			Data: []usermanagement.OrganizationMembership{
				{UserID: "user-2", Role: common.RoleResponse{Slug: "student"}},
			},
		},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user-2").Return(db.UserPreference{}, pgx.ErrNoRows)

	router := chi.NewRouter()
	router.Get("/groups/{groupID}/users", h.ListGroupUsers)
	req := httptest.NewRequest(http.MethodGet, "/groups/"+groupID+"/users", nil)
	req = req.WithContext(withTestUser(req.Context(), &auth.UserContext{
		ID:          "user-1",
		Permissions: []string{permissions.GroupsUserListRead},
	}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusInternalServerError, rec.Body.String())
	}
}

func TestListGroupUsersFiltersStudents(t *testing.T) {
	t.Setenv("DEFAULT_ORG_ID", "org_test")

	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, nil, workos)

	groupID := "11111111-1111-1111-1111-111111111111"
	var pgGroupID pgtype.UUID
	if err := pgGroupID.Scan(groupID); err != nil {
		t.Fatalf("scan group id: %v", err)
	}

	q.EXPECT().ListGroupMembers(gomock.Any(), pgGroupID).Return([]string{"student-1", "expert-1", "admin-1"}, nil)
	workos.EXPECT().ListOrganizationMemberships(gomock.Any(), gomock.Any()).Return(
		usermanagement.ListOrganizationMembershipsResponse{
			Data: []usermanagement.OrganizationMembership{
				{UserID: "student-1", Role: common.RoleResponse{Slug: "student"}},
				{UserID: "expert-1", Role: common.RoleResponse{Slug: "expert"}},
				{UserID: "admin-1", Role: common.RoleResponse{Slug: "admin"}},
			},
		},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "student-1").Return(
		db.UserPreference{UserID: "student-1", FirstName: "Local", LastName: "Student", Username: "local.s"},
		nil,
	)

	router := chi.NewRouter()
	router.Get("/groups/{groupID}/users", h.ListGroupUsers)
	req := httptest.NewRequest(http.MethodGet, "/groups/"+groupID+"/users", nil)
	req = req.WithContext(withTestUser(req.Context(), &auth.UserContext{
		ID:          "viewer-1",
		Permissions: []string{permissions.GroupsUserListRead},
	}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 1 {
		t.Fatalf("got %d users, want 1", len(body.Data))
	}
	if got := body.Data[0]["id"]; got != "student-1" {
		t.Fatalf("got user id %v, want student-1", got)
	}
}

func TestListGroupExpertsFiltersExpertsAndAdmins(t *testing.T) {
	t.Setenv("DEFAULT_ORG_ID", "org_test")

	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, nil, workos)

	groupID := "11111111-1111-1111-1111-111111111111"
	var pgGroupID pgtype.UUID
	if err := pgGroupID.Scan(groupID); err != nil {
		t.Fatalf("scan group id: %v", err)
	}

	q.EXPECT().ListGroupMembers(gomock.Any(), pgGroupID).Return([]string{"student-1", "expert-1", "admin-1"}, nil)
	workos.EXPECT().ListOrganizationMemberships(gomock.Any(), gomock.Any()).Return(
		usermanagement.ListOrganizationMembershipsResponse{
			Data: []usermanagement.OrganizationMembership{
				{UserID: "student-1", Role: common.RoleResponse{Slug: "student"}},
				{UserID: "expert-1", Role: common.RoleResponse{Slug: "expert"}},
				{UserID: "admin-1", Role: common.RoleResponse{Slug: "admin"}},
			},
		},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(
		db.UserPreference{UserID: "expert-1", FirstName: "Local", LastName: "Expert", Username: "local.e"},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "admin-1").Return(
		db.UserPreference{UserID: "admin-1", FirstName: "Local", LastName: "Admin", Username: "local.a"},
		nil,
	)

	router := chi.NewRouter()
	router.Get("/groups/{groupID}/experts", h.ListGroupExperts)
	req := httptest.NewRequest(http.MethodGet, "/groups/"+groupID+"/experts", nil)
	req = req.WithContext(withTestUser(req.Context(), &auth.UserContext{
		ID:          "student-1",
		Permissions: []string{permissions.GroupsExpertListRead},
	}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 2 {
		t.Fatalf("got %d users, want 2", len(body.Data))
	}
	gotIDs := map[string]bool{}
	for _, item := range body.Data {
		gotIDs[item["id"].(string)] = true
	}
	for _, id := range []string{"expert-1", "admin-1"} {
		if !gotIDs[id] {
			t.Fatalf("expected response to include %s: %#v", id, body.Data)
		}
	}
	if gotIDs["student-1"] {
		t.Fatalf("experts list must not include students: %#v", body.Data)
	}
}

func TestListGroupExpertsRequiresExpertListPermission(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, nil, workos)

	router := chi.NewRouter()
	router.Get("/groups/{groupID}/experts", h.ListGroupExperts)
	req := httptest.NewRequest(http.MethodGet, "/groups/11111111-1111-1111-1111-111111111111/experts", nil)
	req = req.WithContext(withTestUser(req.Context(), &auth.UserContext{
		ID:          "viewer-1",
		Permissions: []string{permissions.GroupsUserListRead},
	}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestListGroupUsersRequiresUserListPermission(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, nil, workos)

	router := chi.NewRouter()
	router.Get("/groups/{groupID}/users", h.ListGroupUsers)
	req := httptest.NewRequest(http.MethodGet, "/groups/11111111-1111-1111-1111-111111111111/users", nil)
	req = req.WithContext(withTestUser(req.Context(), &auth.UserContext{
		ID:          "viewer-1",
		Permissions: []string{permissions.GroupsExpertListRead},
	}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusForbidden)
	}
}
