package coaching

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
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

func TestProcessRemindersLocalizesEachRecipient(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	sender := emailmocks.NewMockSender(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(q, nil, sender, workos, slog.Default(), HandlerConfig{})

	var reminderID, bookingID, groupID pgtype.UUID
	for value, target := range map[string]*pgtype.UUID{
		"11111111-1111-1111-1111-111111111111": &reminderID,
		"22222222-2222-2222-2222-222222222222": &bookingID,
		"33333333-3333-3333-3333-333333333333": &groupID,
	} {
		if err := target.Scan(value); err != nil {
			t.Fatalf("scan UUID %s: %v", value, err)
		}
	}

	scheduledAt := time.Date(2026, time.August, 4, 16, 45, 0, 0, time.UTC)
	reminder := db.ListPendingRemindersRow{
		ID:              reminderID,
		BookingID:       bookingID,
		RemindAt:        pgtype.Timestamptz{Time: scheduledAt.Add(-time.Hour), Valid: true},
		ExpertID:        "expert-1",
		StudentID:       "student-1",
		GroupID:         groupID,
		ScheduledAt:     pgtype.Timestamptz{Time: scheduledAt, Valid: true},
		DurationMinutes: 45,
	}
	expertPrefs := db.UserPreference{
		UserID: "expert-1", Language: db.LanguageCodeEn, Timezone: "Australia/Melbourne",
	}
	studentPrefs := db.UserPreference{
		UserID: "student-1", Language: db.LanguageCodeDe, Timezone: "Europe/Berlin",
	}

	q.EXPECT().ListPendingReminders(gomock.Any()).Return([]db.ListPendingRemindersRow{reminder}, nil)
	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "expert-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:     true,
			EmailCoachingRemindersEnabled: true,
		}, nil,
	)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "expert-1"}).Return(
		usermanagement.User{ID: "expert-1", Email: "expert@example.com"}, nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(expertPrefs, nil)
	sender.EXPECT().SendTemplate(
		[]string{"expert@example.com"},
		"Coaching Session Reminder",
		email.TemplateNotification,
		email.Message{Copy: email.Copy{
			Preheader: "You have an upcoming coaching session.",
			Title:     "Coaching session reminder",
			Intro:     "Your coaching session starts at **Wednesday, 5 August 2026 at 02:45 (Australia/Melbourne, UTC+10:00)** and lasts 45 minutes.",
		}},
	).Return(nil)

	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "student-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:     true,
			EmailCoachingRemindersEnabled: true,
		}, nil,
	)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "student-1"}).Return(
		usermanagement.User{ID: "student-1", Email: "student@example.com"}, nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "student-1").Return(studentPrefs, nil)
	sender.EXPECT().SendTemplate(
		[]string{"student@example.com"},
		"Erinnerung an Coaching-Sitzung",
		email.TemplateNotification,
		email.Message{Copy: email.Copy{
			Preheader: "Du hast eine bevorstehende Coaching-Sitzung.",
			Title:     "Erinnerung an Coaching-Sitzung",
			Intro:     "Deine Coaching-Sitzung beginnt am **Dienstag, 4. August 2026 um 18:45 (Europe/Berlin, UTC+02:00)** und dauert 45 Minuten.",
		}},
	).Return(nil)
	q.EXPECT().MarkReminderSent(gomock.Any(), reminderID).Return(nil)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/internal/coaching/reminders", nil)
	h.ProcessReminders(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("ProcessReminders() status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if got, want := recorder.Body.String(), "{\"processed\":1,\"sent\":1}\n"; got != want {
		t.Fatalf("ProcessReminders() body = %q, want %q", got, want)
	}
}
