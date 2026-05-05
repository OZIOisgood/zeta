package coaching

import (
	"context"
	"log/slog"
	"testing"

	authmocks "github.com/OZIOisgood/zeta/internal/auth/mocks"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"go.uber.org/mock/gomock"
)

func TestResolveUsersUsesPreferenceAvatar(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(q, nil, nil, workos, slog.Default(), HandlerConfig{})

	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "expert-1"}).Return(
		usermanagement.User{
			ID:                "expert-1",
			FirstName:         "Example",
			LastName:          "Expert",
			ProfilePictureURL: "https://workos.example/avatar.png",
		},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(
		db.UserPreference{UserID: "expert-1", Avatar: "local-base64-avatar"},
		nil,
	)

	users := h.resolveUsers(context.Background(), []string{"expert-1"})

	got := users["expert-1"]
	if got.Avatar != "local-base64-avatar" {
		t.Fatalf("got avatar %q, want local-base64-avatar", got.Avatar)
	}
}
