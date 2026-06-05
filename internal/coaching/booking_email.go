package coaching

import (
	"context"
	"log/slog"

	goi18n "github.com/nicksnyder/go-i18n/v2/i18n"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/i18n"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// bookingParticipant holds the resolved name and email for a booking participant.
type bookingParticipant struct {
	name  string
	email string
}

// resolveParticipant fetches display name from preferences and email from WorkOS.
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
	prefs, err := h.q.GetUserPreferences(ctx, userID)
	if err != nil {
		h.logger.ErrorContext(ctx, "resolve_participant_preferences_failed",
			slog.String("component", "coaching"),
			slog.String("user_id", userID),
			slog.Any("err", err),
		)
		return bookingParticipant{email: u.Email}
	}
	name, err := preferences.RequireDisplayName(prefs)
	if err != nil {
		h.logger.ErrorContext(ctx, "resolve_participant_display_name_missing",
			slog.String("component", "coaching"),
			slog.String("user_id", userID),
			slog.Any("err", err),
		)
		return bookingParticipant{email: u.Email}
	}
	return bookingParticipant{
		name:  name,
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

	buildMessage := func(loc *goi18n.Localizer, partnerName string) email.Message {
		details := []email.Detail{
			{Label: i18n.T(loc, "email.detail.session"), Value: sessionTypeName},
			{Label: i18n.T(loc, "email.detail.with"), Value: partnerName},
			{Label: i18n.T(loc, "email.detail.group"), Value: groupName},
			{Label: i18n.T(loc, "email.detail.date_and_time"), Value: scheduledStr},
			{Label: i18n.T(loc, "email.detail.duration"), Value: durationStr},
		}
		if b.Notes.Valid && b.Notes.String != "" {
			details = append(details, email.Detail{Label: i18n.T(loc, "email.detail.notes"), Value: b.Notes.String})
		}
		return email.Message{
			Copy: email.Copy{
				Preheader: i18n.T(loc, "email.booking_confirmed.preheader"),
				Title:     i18n.T(loc, "email.booking_confirmed.title"),
				Intro:     i18n.T(loc, "email.booking_confirmed.intro"),
			},
			Details: details,
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
		loc := i18n.For(preferences.UserLang(ctx, h.q, h.logger, t.userID))
		subject := i18n.T(loc, "email.booking_confirmed.subject")
		if err := h.emailService.SendTemplate([]string{t.addr}, subject, email.TemplateNotification, buildMessage(loc, t.partner)); err != nil {
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
	loc := i18n.For(preferences.UserLang(ctx, h.q, h.logger, otherID))
	details := []email.Detail{
		{Label: i18n.T(loc, "email.detail.session"), Value: sessionTypeName},
		{Label: i18n.T(loc, "email.detail.group"), Value: groupName},
		{Label: i18n.T(loc, "email.detail.date_and_time"), Value: scheduledStr},
		{Label: i18n.T(loc, "email.detail.duration"), Value: formatDuration(b.DurationMinutes)},
		{Label: i18n.T(loc, "email.detail.cancelled_by"), Value: cancellerName},
	}
	if reason := b.CancellationReason.String; reason != "" {
		details = append(details, email.Detail{Label: i18n.T(loc, "email.detail.reason"), Value: reason})
	}
	subject := i18n.T(loc, "email.booking_cancelled.subject")
	message := email.Message{
		Copy: email.Copy{
			Preheader: i18n.T(loc, "email.booking_cancelled.preheader"),
			Title:     i18n.T(loc, "email.booking_cancelled.title"),
			Intro:     i18n.T(loc, "email.booking_cancelled.intro"),
		},
		Details: details,
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
