package coaching

import (
	"crypto/subtle"
	"log/slog"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/logger"
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
		subject := "Coaching Session Reminder"
		body := "You have an upcoming coaching session.\n\nDate & Time: " + scheduledStr +
			"\nDuration: " + formatDuration(rem.DurationMinutes)

		recipients := h.resolveEmails(ctx, []string{rem.ExpertID, rem.StudentID})
		if len(recipients) > 0 {
			if err := h.emailService.Send(recipients, subject, body); err != nil {
				log.ErrorContext(ctx, "reminder_email_failed",
					slog.String("component", "coaching"),
					slog.String("reminder_id", uuidToString(rem.ID)),
					slog.Any("err", err),
				)
				continue // don't mark as sent so it's retried
			}
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
