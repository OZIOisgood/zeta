package invitations

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	emailmocks "github.com/OZIOisgood/zeta/internal/email/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

func invitationTestUser() *auth.UserContext {
	return &auth.UserContext{
		ID:          "user-1",
		FirstName:   "Test",
		LastName:    "Expert",
		Role:        "expert",
		Permissions: []string{permissions.GroupsInvitesCreate},
	}
}

func invitationTestContext(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func invitationTestUUID(t *testing.T, value string) pgtype.UUID {
	t.Helper()

	var id pgtype.UUID
	if err := id.Scan(value); err != nil {
		t.Fatalf("scan uuid %q: %v", value, err)
	}
	return id
}

func TestCreateInvitationAllowsMissingEmail(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	sender := emailmocks.NewMockSender(ctrl)
	h := NewHandler(q, sender, nil, slog.Default(), "http://localhost:4200")

	groupID := "11111111-1111-1111-1111-111111111111"
	pgGroupID := invitationTestUUID(t, groupID)
	invitationID := invitationTestUUID(t, "22222222-2222-2222-2222-222222222222")

	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "user-1",
		GroupID: pgGroupID,
	}).Return(true, nil)
	q.EXPECT().CreateGroupInvitation(gomock.Any(), createGenericInvitationMatcher{
		groupID:   pgGroupID,
		inviterID: "user-1",
	}).DoAndReturn(func(_ context.Context, arg db.CreateGroupInvitationParams) (db.GroupInvitation, error) {
		return db.GroupInvitation{
			ID:        invitationID,
			GroupID:   arg.GroupID,
			InviterID: arg.InviterID,
			Email:     arg.Email,
			Code:      arg.Code,
			Status:    db.InvitationStatusPending,
		}, nil
	})

	router := chi.NewRouter()
	router.Post("/groups/{groupID}/invitations", h.CreateInvitation)
	req := httptest.NewRequest(http.MethodPost, "/groups/"+groupID+"/invitations", strings.NewReader(`{}`))
	req = req.WithContext(invitationTestContext(req.Context(), invitationTestUser()))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}

	var body struct {
		ID   string `json:"id"`
		Code string `json:"code"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.ID != "22222222-2222-2222-2222-222222222222" {
		t.Fatalf("got id %q, want invitation uuid", body.ID)
	}
	if len(body.Code) != 6 {
		t.Fatalf("got code length %d, want 6", len(body.Code))
	}
}

type createGenericInvitationMatcher struct {
	groupID   pgtype.UUID
	inviterID string
}

func (m createGenericInvitationMatcher) Matches(x any) bool {
	arg, ok := x.(db.CreateGroupInvitationParams)
	return ok &&
		arg.GroupID == m.groupID &&
		arg.InviterID == m.inviterID &&
		!arg.Email.Valid &&
		len(arg.Code) == 6
}

func (m createGenericInvitationMatcher) String() string {
	return "generic invitation create params"
}

func TestAcceptInvitationKeepsGenericInvitationPending(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	sender := emailmocks.NewMockSender(ctrl)
	h := NewHandler(q, sender, nil, slog.Default(), "http://localhost:4200")

	groupID := invitationTestUUID(t, "11111111-1111-1111-1111-111111111111")
	invitationID := invitationTestUUID(t, "22222222-2222-2222-2222-222222222222")

	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "AbC123").Return(db.GroupInvitation{
		ID:        invitationID,
		GroupID:   groupID,
		InviterID: "user-1",
		Email:     pgtype.Text{},
		Code:      "AbC123",
		Status:    db.InvitationStatusPending,
	}, nil)
	q.EXPECT().AddUserToGroup(gomock.Any(), db.AddUserToGroupParams{
		UserID:  "user-2",
		GroupID: groupID,
	}).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/groups/invitations/accept", strings.NewReader(`{"code":"AbC123"}`))
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{
		ID:        "user-2",
		FirstName: "Test",
		LastName:  "Student",
	}))
	rec := httptest.NewRecorder()

	h.AcceptInvitation(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body struct {
		GroupID string `json:"group_id"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.GroupID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("got group_id %q, want group uuid", body.GroupID)
	}
}
