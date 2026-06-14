package invitations

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
	emailmocks "github.com/OZIOisgood/zeta/internal/email/mocks"
	"github.com/OZIOisgood/zeta/internal/notifications"
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
	if len(body.Code) != 8 {
		t.Fatalf("got code length %d, want 8", len(body.Code))
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
		len(arg.Code) == 8
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
	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "user-2",
		GroupID: groupID,
	}).Return(false, nil)
	q.EXPECT().AddUserToGroup(gomock.Any(), db.AddUserToGroupParams{
		UserID:  "user-2",
		GroupID: groupID,
	}).Return(nil)
	// Background group_member_joined notification: owner == joiner short-circuits
	// before any CreateNotification. AnyTimes tolerates the detached goroutine.
	q.EXPECT().GetGroup(gomock.Any(), groupID).Return(db.Group{ID: groupID, OwnerID: "user-2"}, nil).AnyTimes()

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

func TestDeclineInvitationMarksEmailInvitationDeclined(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, slog.Default(), "http://localhost:4200")

	groupID := invitationTestUUID(t, "11111111-1111-1111-1111-111111111111")
	invitationID := invitationTestUUID(t, "22222222-2222-2222-2222-222222222222")

	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "AbC123").Return(db.GroupInvitation{
		ID:      invitationID,
		GroupID: groupID,
		Email:   pgtype.Text{String: "invitee@example.com", Valid: true},
		Code:    "AbC123",
		Status:  db.InvitationStatusPending,
	}, nil)
	// Single-recipient invitation: must be persisted as declined.
	q.EXPECT().UpdateGroupInvitationStatus(gomock.Any(), db.UpdateGroupInvitationStatusParams{
		ID:     invitationID,
		Status: db.InvitationStatusDeclined,
	}).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/groups/invitations/decline", strings.NewReader(`{"code":"AbC123"}`))
	// The signed-in user is the intended recipient (email matches the invitation).
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{
		ID:    "user-2",
		Email: "Invitee@Example.com",
	}))
	rec := httptest.NewRecorder()

	h.DeclineInvitation(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusNoContent)
	}
}

func TestDeclineInvitationRejectsNonRecipient(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, slog.Default(), "http://localhost:4200")

	groupID := invitationTestUUID(t, "11111111-1111-1111-1111-111111111111")
	invitationID := invitationTestUUID(t, "22222222-2222-2222-2222-222222222222")

	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "AbC123").Return(db.GroupInvitation{
		ID:      invitationID,
		GroupID: groupID,
		Email:   pgtype.Text{String: "invitee@example.com", Valid: true},
		Code:    "AbC123",
		Status:  db.InvitationStatusPending,
	}, nil)
	// A user who is NOT the addressed recipient must not be able to decline it.
	// No UpdateGroupInvitationStatus expectation: gomock fails if it is mutated.

	req := httptest.NewRequest(http.MethodPost, "/groups/invitations/decline", strings.NewReader(`{"code":"AbC123"}`))
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{
		ID:    "attacker",
		Email: "someone-else@example.com",
	}))
	rec := httptest.NewRecorder()

	h.DeclineInvitation(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestAcceptInvitationNotifiesGroupOwner(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, slog.Default(), "http://localhost:4200")

	groupID := invitationTestUUID(t, "11111111-1111-1111-1111-111111111111")
	invitationID := invitationTestUUID(t, "22222222-2222-2222-2222-222222222222")

	// Generic (no email) invitation so the accept path skips the email goroutine;
	// the only background work is the member-joined notification.
	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "AbC123").Return(db.GroupInvitation{
		ID:      invitationID,
		GroupID: groupID,
		Code:    "AbC123",
		Status:  db.InvitationStatusPending,
	}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), gomock.Any()).Return(false, nil)
	q.EXPECT().AddUserToGroup(gomock.Any(), gomock.Any()).Return(nil)
	// Owner differs from the joiner, so a notification must be recorded for the owner.
	q.EXPECT().GetGroup(gomock.Any(), groupID).
		Return(db.Group{ID: groupID, OwnerID: "owner-1", Name: "Academy"}, nil).
		AnyTimes()

	recorded := make(chan db.CreateNotificationParams, 1)
	q.EXPECT().CreateNotification(gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, arg db.CreateNotificationParams) (db.Notification, error) {
			recorded <- arg
			return db.Notification{}, nil
		}).Times(1)

	req := httptest.NewRequest(http.MethodPost, "/groups/invitations/accept", strings.NewReader(`{"code":"AbC123"}`))
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{
		ID:        "user-2",
		FirstName: "New",
		LastName:  "Member",
	}))
	rec := httptest.NewRecorder()

	h.AcceptInvitation(rec, req)

	select {
	case arg := <-recorded:
		if arg.RecipientID != "owner-1" {
			t.Fatalf("recipient = %q, want owner-1", arg.RecipientID)
		}
		if arg.Type != db.NotificationType(notifications.TypeGroupMemberJoined) {
			t.Fatalf("type = %q, want %q", arg.Type, notifications.TypeGroupMemberJoined)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("CreateNotification was not called for the group owner")
	}
}

func TestDeclineInvitationKeepsGenericInvitationPending(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, slog.Default(), "http://localhost:4200")

	groupID := invitationTestUUID(t, "11111111-1111-1111-1111-111111111111")
	invitationID := invitationTestUUID(t, "22222222-2222-2222-2222-222222222222")

	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "AbC123").Return(db.GroupInvitation{
		ID:      invitationID,
		GroupID: groupID,
		Code:    "AbC123",
		Status:  db.InvitationStatusPending,
	}, nil)
	// Generic link/QR invitation (no email): invitation status must NOT change so
	// the shared link stays usable for others. The handler must mark the user's own
	// notification as read so the UI hides the accept/decline prompt.
	q.EXPECT().MarkNotificationReadByInviteCode(gomock.Any(), db.MarkNotificationReadByInviteCodeParams{
		RecipientID: "user-2",
		Code:        []byte("AbC123"),
	}).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/groups/invitations/decline", strings.NewReader(`{"code":"AbC123"}`))
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{ID: "user-2"}))
	rec := httptest.NewRecorder()

	h.DeclineInvitation(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusNoContent)
	}
}

func TestGetInvitationInfoMarksExistingMember(t *testing.T) {
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
		Status:    db.InvitationStatusAccepted,
	}, nil)
	q.EXPECT().GetGroup(gomock.Any(), groupID).Return(db.Group{
		ID:     groupID,
		Name:   "Group Chrome",
		Avatar: "avatar-data",
	}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "user-2",
		GroupID: groupID,
	}).Return(true, nil)

	router := chi.NewRouter()
	router.Get("/groups/invitations/{code}", h.GetInvitationInfo)
	req := httptest.NewRequest(http.MethodGet, "/groups/invitations/AbC123", nil)
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{ID: "user-2"}))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body struct {
		Code          string `json:"code"`
		GroupID       string `json:"group_id"`
		GroupName     string `json:"group_name"`
		GroupAvatar   string `json:"group_avatar"`
		AlreadyMember bool   `json:"already_member"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.AlreadyMember {
		t.Fatalf("expected already_member to be true")
	}
	if body.GroupID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("got group_id %q, want group uuid", body.GroupID)
	}
	if body.GroupName != "Group Chrome" {
		t.Fatalf("got group_name %q, want Group Chrome", body.GroupName)
	}
}

func TestAcceptInvitationReturnsExistingMemberGroup(t *testing.T) {
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
		Status:    db.InvitationStatusAccepted,
	}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "user-2",
		GroupID: groupID,
	}).Return(true, nil)

	req := httptest.NewRequest(http.MethodPost, "/groups/invitations/accept", strings.NewReader(`{"code":"AbC123"}`))
	req = req.WithContext(invitationTestContext(req.Context(), &auth.UserContext{ID: "user-2"}))
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
