package coaching

import (
	"context"
	"log/slog"
	"strings"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// bookingParticipant holds the resolved name and email for a booking participant.
type bookingParticipant struct {
	name  string
	email string
}

// resolveParticipant fetches a WorkOS user's display name and email address in one call.
func (h *Handler) resolveParticipant(ctx context.Context, userID string) bookingParticipant {
	u, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{User: userID})
	if err != nil {
		h.logger.WarnContext(ctx, "resolve_participant_failed",
			slog.String("component", "coaching"),
			slog.String("user_id", userID),
			slog.Any("err", err),
		)
		return bookingParticipant{}
	}
	return bookingParticipant{
		name:  strings.TrimSpace(u.FirstName + " " + u.LastName),
		email: u.Email,
	}
}

func (h *Handler) sendBookingCreatedEmail(ctx context.Context, b db.CoachingBooking, sessionTypeName string) {
	log := logger.From(ctx, h.logger)

	groupName := ""
	if group, err := h.q.GetGroup(ctx, b.GroupID); err != nil {
		log.WarnContext(ctx, "booking_email_fetch_group_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
			slog.Any("err", err),
		)
	} else {
		groupName = group.Name
	}

	expert := h.resolveParticipant(ctx, b.ExpertID)
	student := h.resolveParticipant(ctx, b.StudentID)

	scheduledStr := b.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")
	durationStr := formatDuration(b.DurationMinutes)
	subject := "Live Coaching Session Confirmed"

	buildMessage := func(partnerName string) email.Message {
		details := []email.Detail{
			{Label: "Session", Value: sessionTypeName},
			{Label: "With", Value: partnerName},
			{Label: "Group", Value: groupName},
			{Label: "Date and time", Value: scheduledStr},
			{Label: "Duration", Value: durationStr},
		}
		if b.Notes.Valid && b.Notes.String != "" {
			details = append(details, email.Detail{Label: "Notes", Value: b.Notes.String})
		}
		return email.Message{
			Preheader: "Your live coaching session has been confirmed.",
			Heading:   "Live coaching session confirmed",
			Intro:     "Your live coaching session has been confirmed.",
			Details:   details,
		}
	}

	type emailTarget struct {
		userID  string
		addr    string
		partner string
	}
	targets := []emailTarget{
		{userID: b.StudentID, addr: student.email, partner: expert.name},
		{userID: b.ExpertID, addr: expert.email, partner: student.name},
	}

	sentCount := 0
	for _, t := range targets {
		if t.addr == "" {
			continue
		}
		if !preferences.AllowsUserEmail(ctx, h.q, h.logger, t.userID, preferences.EmailCategoryCoachingBookingUpdates) {
			log.InfoContext(ctx, "booking_created_email_skipped_by_preferences",
				slog.String("component", "coaching"),
				slog.String("booking_id", uuidToString(b.ID)),
				slog.String("user_id", t.userID),
			)
			continue
		}
		if err := h.emailService.SendTemplate([]string{t.addr}, subject, email.TemplateNotification, buildMessage(t.partner)); err != nil {
			log.ErrorContext(ctx, "booking_created_email_failed",
				slog.String("component", "coaching"),
				slog.String("user_id", t.userID),
				slog.Any("err", err),
			)
			continue
		}
		sentCount++
	}

	if sentCount == 0 {
		log.WarnContext(ctx, "booking_created_email_no_recipients",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
		)
		return
	}

	log.InfoContext(ctx, "booking_created_email_sent",
		slog.String("component", "coaching"),
		slog.String("expert_id", b.ExpertID),
		slog.String("student_id", b.StudentID),
		slog.String("scheduled_at", scheduledStr),
	)
}

func (h *Handler) sendCancellationEmail(ctx context.Context, b db.CoachingBooking, cancelledByID string) {
	log := logger.From(ctx, h.logger)

	sessionTypeName := ""
	if st, err := h.q.GetSessionType(ctx, db.GetSessionTypeParams{ID: b.SessionTypeID, GroupID: b.GroupID}); err != nil {
		log.WarnContext(ctx, "cancellation_email_fetch_session_type_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
			slog.Any("err", err),
		)
	} else {
		sessionTypeName = st.Name
	}

	groupName := ""
	if group, err := h.q.GetGroup(ctx, b.GroupID); err != nil {
		log.WarnContext(ctx, "cancellation_email_fetch_group_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
			slog.Any("err", err),
		)
	} else {
		groupName = group.Name
	}

	expert := h.resolveParticipant(ctx, b.ExpertID)
	student := h.resolveParticipant(ctx, b.StudentID)

	cancellerName := expert.name
	if cancelledByID == b.StudentID {
		cancellerName = student.name
	}

	// Notify the other party (the one who didn't cancel).
	otherEmail := student.email
	otherID := b.StudentID
	if cancelledByID == b.StudentID {
		otherEmail = expert.email
		otherID = b.ExpertID
	}
	if otherEmail == "" {
		return
	}
	if !preferences.AllowsUserEmail(ctx, h.q, h.logger, otherID, preferences.EmailCategoryCoachingBookingUpdates) {
		log.InfoContext(ctx, "booking_cancellation_email_skipped_by_preferences",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
			slog.String("user_id", otherID),
		)
		return
	}

	scheduledStr := b.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")
	subject := "Live Coaching Session Cancelled"
	details := []email.Detail{
		{Label: "Session", Value: sessionTypeName},
		{Label: "Group", Value: groupName},
		{Label: "Date and time", Value: scheduledStr},
		{Label: "Duration", Value: formatDuration(b.DurationMinutes)},
		{Label: "Cancelled by", Value: cancellerName},
	}
	if reason := b.CancellationReason.String; reason != "" {
		details = append(details, email.Detail{Label: "Reason", Value: reason})
	}
	message := email.Message{
		Preheader: "A coaching session has been cancelled.",
		Heading:   "Live coaching session cancelled",
		Intro:     "A coaching session has been cancelled.",
		Details:   details,
	}

	if err := h.emailService.SendTemplate([]string{otherEmail}, subject, email.TemplateNotification, message); err != nil {
		log.ErrorContext(ctx, "booking_cancellation_email_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		return
	}

	log.InfoContext(ctx, "booking_cancellation_email_sent",
		slog.String("component", "coaching"),
		slog.String("expert_id", b.ExpertID),
		slog.String("student_id", b.StudentID),
		slog.String("cancelled_by", cancelledByID),
		slog.String("scheduled_at", scheduledStr),
	)
}
