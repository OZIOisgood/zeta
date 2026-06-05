package coaching

import (
	"log/slog"
	"testing"
	"time"

	authmocks "github.com/OZIOisgood/zeta/internal/auth/mocks"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/email"
	emailmocks "github.com/OZIOisgood/zeta/internal/email/mocks"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"go.uber.org/mock/gomock"
)

func TestSendBookingCreatedEmailSkipsDisabledRecipient(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	sender := emailmocks.NewMockSender(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(q, nil, sender, workos, slog.Default(), HandlerConfig{})

	var groupID pgtype.UUID
	if err := groupID.Scan("11111111-1111-1111-1111-111111111111"); err != nil {
		t.Fatalf("scan group id: %v", err)
	}

	booking := db.CoachingBooking{
		ID:              groupID,
		ExpertID:        "expert-1",
		StudentID:       "student-1",
		GroupID:         groupID,
		ScheduledAt:     pgtype.Timestamptz{Time: time.Now().Add(24 * time.Hour), Valid: true},
		DurationMinutes: 60,
	}

	q.EXPECT().GetGroup(gomock.Any(), groupID).Return(db.Group{Name: "Training"}, nil)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "expert-1"}).Return(
		usermanagement.User{ID: "expert-1", Email: "expert@example.com", FirstName: "Expert", LastName: "One"},
		nil,
	)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "student-1"}).Return(
		usermanagement.User{ID: "student-1", Email: "student@example.com", FirstName: "Student", LastName: "One"},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(
		db.UserPreference{UserID: "expert-1", FirstName: "Local", LastName: "Expert", Language: db.LanguageCodeEn},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "student-1").Return(
		db.UserPreference{UserID: "student-1", FirstName: "Local", LastName: "Student", Language: db.LanguageCodeEn},
		nil,
	)
	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "student-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:          true,
			EmailCoachingBookingUpdatesEnabled: false,
		},
		nil,
	)
	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "expert-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:          true,
			EmailCoachingBookingUpdatesEnabled: true,
		},
		nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(
		db.UserPreference{UserID: "expert-1", FirstName: "Local", LastName: "Expert", Language: db.LanguageCodeEn},
		nil,
	)
	sender.EXPECT().SendTemplate([]string{"expert@example.com"}, gomock.Any(), email.TemplateNotification, gomock.Any()).Return(nil)

	h.sendBookingCreatedEmail(t.Context(), booking, "Private Session")
}
