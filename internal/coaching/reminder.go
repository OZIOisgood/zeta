package coaching

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/jackc/pgx/v5/pgtype"
)

type ReminderHandler struct {
	q      *db.Queries
	email  *email.Service
	logger *slog.Logger
}

func NewReminderHandler(q *db.Queries, email *email.Service, logger *slog.Logger) *ReminderHandler {
	return &ReminderHandler{
		q:      q,
		email:  email,
		logger: logger,
	}
}

func (h *ReminderHandler) ProcessReminders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	// Verify scheduler secret
	secret := r.Header.Get("X-Scheduler-Secret")
	expected := os.Getenv("SCHEDULER_SECRET")
	if expected == "" || secret != expected {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var totalSent int

	// Process 24h reminders
	sessions24h, err := h.q.GetSessionsNeedingReminder24h(ctx)
	if err != nil {
		log.ErrorContext(ctx, "coaching_reminder_24h_query_failed",
			slog.String("component", "coaching_reminders"),
			slog.Any("err", err),
		)
	} else {
		for _, s := range sessions24h {
			h.sendReminder(ctx, log, s.ID, s.Title, s.StudentID, s.ExpertID, s.ScheduledAt, s.DurationMinutes, s.GroupName, "24 hours")
			_ = h.q.MarkReminder24hSent(ctx, s.ID)
			totalSent++
		}
	}

	// Process 1h reminders
	sessions1h, err := h.q.GetSessionsNeedingReminder1h(ctx)
	if err != nil {
		log.ErrorContext(ctx, "coaching_reminder_1h_query_failed",
			slog.String("component", "coaching_reminders"),
			slog.Any("err", err),
		)
	} else {
		for _, s := range sessions1h {
			h.sendReminder(ctx, log, s.ID, s.Title, s.StudentID, s.ExpertID, s.ScheduledAt, s.DurationMinutes, s.GroupName, "1 hour")
			_ = h.q.MarkReminder1hSent(ctx, s.ID)
			totalSent++
		}
	}

	// Process 15m reminders
	sessions15m, err := h.q.GetSessionsNeedingReminder15m(ctx)
	if err != nil {
		log.ErrorContext(ctx, "coaching_reminder_15m_query_failed",
			slog.String("component", "coaching_reminders"),
			slog.Any("err", err),
		)
	} else {
		for _, s := range sessions15m {
			h.sendReminder(ctx, log, s.ID, s.Title, s.StudentID, s.ExpertID, s.ScheduledAt, s.DurationMinutes, s.GroupName, "15 minutes")
			_ = h.q.MarkReminder15mSent(ctx, s.ID)
			totalSent++
		}
	}

	log.InfoContext(ctx, "coaching_reminders_processed",
		slog.String("component", "coaching_reminders"),
		slog.Int("total_sent", totalSent),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "ok",
		"total_sent": totalSent,
	})
}

func (h *ReminderHandler) sendReminder(
	ctx context.Context,
	log *slog.Logger,
	sessionID pgtype.UUID,
	title, studentID, expertID string,
	scheduledAt pgtype.Timestamptz,
	durationMinutes int32,
	groupName string,
	timeframe string,
) {
	sessionIDStr := toReminderUUIDString(sessionID)
	subject := fmt.Sprintf("Coaching Session Reminder — %s", title)
	body := fmt.Sprintf(
		"Your coaching session \"%s\" in group \"%s\" is starting in %s.\n\n"+
			"Scheduled: %s\nDuration: %d minutes\n\n"+
			"Join your session at: %s/coaching/%s/call",
		title,
		groupName,
		timeframe,
		scheduledAt.Time.Format(time.RFC1123),
		durationMinutes,
		os.Getenv("FRONTEND_URL"),
		sessionIDStr,
	)

	// Send to both student and expert (using their IDs as email placeholders)
	// In production, you'd look up their email addresses from WorkOS
	recipients := []string{studentID, expertID}
	for _, r := range recipients {
		if err := h.email.Send([]string{r}, subject, body); err != nil {
			log.ErrorContext(ctx, "coaching_reminder_send_failed",
				slog.String("component", "coaching_reminders"),
				slog.String("session_id", sessionIDStr),
				slog.String("recipient", r),
				slog.Any("err", err),
			)
		}
	}
}

func toReminderUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}
