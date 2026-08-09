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

func TestSendBookingCreatedEmailLocalizesEachRecipient(t *testing.T) {
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
		ScheduledAt:     pgtype.Timestamptz{Time: time.Date(2026, time.August, 4, 16, 45, 0, 0, time.UTC), Valid: true},
		DurationMinutes: 45,
	}
	expertPrefs := db.UserPreference{
		UserID: "expert-1", FirstName: "Alex", LastName: "Coach",
		Language: db.LanguageCodeEn, Timezone: "Australia/Melbourne",
	}
	studentPrefs := db.UserPreference{
		UserID: "student-1", FirstName: "Bea", LastName: "Rider",
		Language: db.LanguageCodeDe, Timezone: "Europe/Berlin",
	}

	q.EXPECT().GetGroup(gomock.Any(), groupID).Return(db.Group{Name: "Training"}, nil)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "expert-1"}).Return(
		usermanagement.User{ID: "expert-1", Email: "expert@example.com"}, nil,
	)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "student-1"}).Return(
		usermanagement.User{ID: "student-1", Email: "student@example.com"}, nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(expertPrefs, nil).Times(2)
	q.EXPECT().GetUserPreferences(gomock.Any(), "student-1").Return(studentPrefs, nil).Times(2)
	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "student-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:          true,
			EmailCoachingBookingUpdatesEnabled: true,
		}, nil,
	)
	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "expert-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:          true,
			EmailCoachingBookingUpdatesEnabled: true,
		}, nil,
	)

	sender.EXPECT().SendTemplate(
		[]string{"student@example.com"},
		"Live-Coaching-Sitzung bestätigt",
		email.TemplateNotification,
		email.Message{Copy: email.Copy{
			Preheader: "Deine Live-Coaching-Sitzung wurde bestätigt.",
			Title:     "Live-Coaching-Sitzung bestätigt",
			Intro:     "Deine Sitzung **„Reitstunde“** mit **Alex Coach** für **„Training“** ist für **Dienstag, 4. August 2026 um 18:45 (Europe/Berlin, UTC+02:00)** gebucht und dauert 45 Minuten.",
		}},
	).Return(nil)
	sender.EXPECT().SendTemplate(
		[]string{"expert@example.com"},
		"Live Coaching Session Confirmed",
		email.TemplateNotification,
		email.Message{Copy: email.Copy{
			Preheader: "Your live coaching session has been confirmed.",
			Title:     "Live coaching session confirmed",
			Intro:     "Your **“Reitstunde”** session with **Bea Rider** for **“Training”** is booked for **Wednesday, 5 August 2026 at 02:45 (Australia/Melbourne, UTC+10:00)** and lasts 45 minutes.",
		}},
	).Return(nil)

	h.sendBookingCreatedEmail(t.Context(), booking, "Reitstunde")
}

func TestSendCancellationEmailUsesRemainingRecipientsTimezone(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	sender := emailmocks.NewMockSender(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(q, nil, sender, workos, slog.Default(), HandlerConfig{})

	var bookingID, groupID, sessionTypeID pgtype.UUID
	for value, target := range map[string]*pgtype.UUID{
		"11111111-1111-1111-1111-111111111111": &bookingID,
		"22222222-2222-2222-2222-222222222222": &groupID,
		"33333333-3333-3333-3333-333333333333": &sessionTypeID,
	} {
		if err := target.Scan(value); err != nil {
			t.Fatalf("scan UUID %s: %v", value, err)
		}
	}

	booking := db.CoachingBooking{
		ID:                 bookingID,
		ExpertID:           "expert-1",
		StudentID:          "student-1",
		GroupID:            groupID,
		SessionTypeID:      sessionTypeID,
		ScheduledAt:        pgtype.Timestamptz{Time: time.Date(2026, time.August, 4, 16, 45, 0, 0, time.UTC), Valid: true},
		DurationMinutes:    45,
		CancellationReason: pgtype.Text{String: "Terminüberschneidung", Valid: true},
	}
	expertPrefs := db.UserPreference{
		UserID: "expert-1", FirstName: "Alex", LastName: "Coach",
		Language: db.LanguageCodeEn, Timezone: "Australia/Melbourne",
	}
	studentPrefs := db.UserPreference{
		UserID: "student-1", FirstName: "Bea", LastName: "Rider",
		Language: db.LanguageCodeDe, Timezone: "Europe/Berlin",
	}

	q.EXPECT().GetSessionType(gomock.Any(), db.GetSessionTypeParams{ID: sessionTypeID, GroupID: groupID}).Return(
		db.CoachingSessionType{Name: "Reitstunde"}, nil,
	)
	q.EXPECT().GetGroup(gomock.Any(), groupID).Return(db.Group{Name: "Training"}, nil)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "expert-1"}).Return(
		usermanagement.User{ID: "expert-1", Email: "expert@example.com"}, nil,
	)
	workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: "student-1"}).Return(
		usermanagement.User{ID: "student-1", Email: "student@example.com"}, nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "expert-1").Return(expertPrefs, nil)
	q.EXPECT().GetUserPreferences(gomock.Any(), "student-1").Return(studentPrefs, nil).Times(2)
	q.EXPECT().GetUserEmailPreferences(gomock.Any(), "student-1").Return(
		db.GetUserEmailPreferencesRow{
			EmailNotificationsEnabled:          true,
			EmailCoachingBookingUpdatesEnabled: true,
		}, nil,
	)

	sender.EXPECT().SendTemplate(
		[]string{"student@example.com"},
		"Live-Coaching-Sitzung abgesagt",
		email.TemplateNotification,
		email.Message{Copy: email.Copy{
			Preheader: "Eine Coaching-Sitzung wurde abgesagt.",
			Title:     "Live-Coaching-Sitzung abgesagt",
			Intro:     "Die Sitzung **„Reitstunde“** für **„Training“** am **Dienstag, 4. August 2026 um 18:45 (Europe/Berlin, UTC+02:00)** wurde von **Alex Coach** abgesagt.",
			Note:      "Grund: Terminüberschneidung",
		}},
	).Return(nil)

	h.sendCancellationEmail(t.Context(), booking, "expert-1")
}
