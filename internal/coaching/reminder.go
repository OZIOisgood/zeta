package coaching

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/i18n"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// ProcessReminders is an internal endpoint called by Cloud Scheduler.
// It finds all pending reminders whose remind_at <= now, sends emails,
// and marks them as sent.
func (h *Handler) ProcessReminders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	// Validate scheduler secret via Authorization header.
	secret := r.Header.Get("Authorization")
	if h.schedulerSecret == "" || subtle.ConstantTimeCompare([]byte(secret), []byte("Bearer "+h.schedulerSecret)) != 1 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	reminders, err := h.q.ListPendingReminders(ctx)
	if err != nil {
		log.ErrorContext(ctx, "list_pending_reminders_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list reminders", http.StatusInternalServerError)
		return
	}

	sent := 0
	for _, rem := range reminders {
		if rem.IsCancelled {
			// Booking was cancelled — just mark as sent so we skip it.
			_ = h.q.MarkReminderSent(ctx, rem.ID)
			continue
		}

		scheduledStr := rem.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")

		// isImminent is true for the ≤20-min reminder that includes a join link.
		diff := rem.ScheduledAt.Time.Sub(rem.RemindAt.Time)
		isImminent := diff <= 20*time.Minute

		var joinURL string
		if isImminent && h.appBaseURL != "" {
			groupID := uuidToString(rem.GroupID)
			bookingID := uuidToString(rem.BookingID)
			joinURL = h.appBaseURL + "/sessions/" + groupID + "/" + bookingID + "/call"
		}

		// Send a separate, language-aware email per recipient.
		// If any send errors we skip the MarkReminderSent so it is retried.
		sendFailed := false
		for _, userID := range []string{rem.ExpertID, rem.StudentID} {
			if !preferences.AllowsUserEmail(ctx, h.q, h.logger, userID, preferences.EmailCategoryCoachingReminders) {
				log.InfoContext(ctx, "reminder_email_skipped_by_preferences",
					slog.String("component", "coaching"),
					slog.String("reminder_id", uuidToString(rem.ID)),
					slog.String("user_id", userID),
				)
				continue
			}

			u, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{User: userID})
			if err != nil || u.Email == "" {
				log.WarnContext(ctx, "reminder_email_resolve_user_failed",
					slog.String("component", "coaching"),
					slog.String("user_id", userID),
					slog.Any("err", err),
				)
				continue
			}

			loc := i18n.For(preferences.UserLang(ctx, h.q, h.logger, userID))
			introKey := "email.reminder.intro"
			if isImminent {
				introKey = "email.reminder.intro_imminent"
			}
			msg := email.Message{
				Copy: email.Copy{
					Preheader: i18n.T(loc, "email.reminder.preheader"),
					Title:     i18n.T(loc, "email.reminder.title"),
					Intro:     i18n.T(loc, introKey),
				},
				Details: []email.Detail{
					{Label: i18n.T(loc, "email.detail.date_and_time"), Value: scheduledStr},
					{Label: i18n.T(loc, "email.detail.duration"), Value: formatDuration(rem.DurationMinutes)},
				},
			}
			if joinURL != "" {
				msg.Copy.Button = i18n.T(loc, "email.reminder.button")
				msg.Action = &email.Action{URL: joinURL}
			}

			subject := i18n.T(loc, "email.reminder.subject")
			if err := h.emailService.SendTemplate([]string{u.Email}, subject, email.TemplateNotification, msg); err != nil {
				log.ErrorContext(ctx, "reminder_email_failed",
					slog.String("component", "coaching"),
					slog.String("reminder_id", uuidToString(rem.ID)),
					slog.String("user_id", userID),
					slog.Any("err", err),
				)
				sendFailed = true
			}
		}

		if sendFailed {
			continue // don't mark as sent so it is retried on the next poll
		}

		if err := h.q.MarkReminderSent(ctx, rem.ID); err != nil {
			log.ErrorContext(ctx, "mark_reminder_sent_failed",
				slog.String("component", "coaching"),
				slog.String("reminder_id", uuidToString(rem.ID)),
				slog.Any("err", err),
			)
		}
		sent++
	}

	log.InfoContext(ctx, "reminders_processed",
		slog.String("component", "coaching"),
		slog.Int("total", len(reminders)),
		slog.Int("sent", sent),
	)

	writeJSON(w, http.StatusOK, map[string]int{"processed": len(reminders), "sent": sent})
}

// scheduleReminders creates 24h, 1h, and 15min reminder rows for a new booking.
// Failures are logged but do not affect the booking creation response.
func (h *Handler) scheduleReminders(ctx context.Context, b db.CoachingBooking) {
	log := logger.From(ctx, h.logger)
	offsets := []time.Duration{24 * time.Hour, 1 * time.Hour, 15 * time.Minute}

	for _, offset := range offsets {
		remindAt := b.ScheduledAt.Time.Add(-offset)
		if remindAt.Before(time.Now()) {
			continue // skip reminders that are already in the past
		}
		err := h.q.CreateBookingReminder(ctx, db.CreateBookingReminderParams{
			BookingID: b.ID,
			RemindAt:  pgtype.Timestamptz{Time: remindAt, Valid: true},
		})
		if err != nil {
			log.ErrorContext(ctx, "schedule_reminder_failed",
				slog.String("component", "coaching"),
				slog.Any("err", err),
				slog.String("booking_id", uuidToString(b.ID)),
				slog.Duration("offset", offset),
			)
		}
	}
}
