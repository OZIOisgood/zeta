package coaching

import (
	"context"
	"log/slog"
	"testing"

	authmocks "github.com/OZIOisgood/zeta/internal/auth/mocks"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"go.uber.org/mock/gomock"
)

func TestResolveUsersUsesPreferences(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(q, nil, nil, workos, slog.Default(), HandlerConfig{})

	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(
		db.UserPreference{
			UserID:    "expert-1",
			FirstName: "Local",
			LastName:  "Expert",
			Username:  "local.e",
			Avatar:    "local-base64-avatar",
		},
		nil,
	)

	users, err := h.resolveUsers(context.Background(), []string{"expert-1"})
	if err != nil {
		t.Fatalf("resolveUsers: %v", err)
	}

	got := users["expert-1"]
	if got.Username != "local.e" {
		t.Fatalf("got username %q, want local.e", got.Username)
	}
	if got.Avatar != "local-base64-avatar" {
		t.Fatalf("got avatar %q, want local-base64-avatar", got.Avatar)
	}
}
