package contact

import (
	"context"
	"fmt"
	"strings"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	emailtemplate "github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/i18n"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/resend/resend-go/v3"
)

type ResendSender struct {
	client         *resend.Client
	from           string
	supportAddress string
}

func NewResendSender(apiKey, from, supportAddress string) *ResendSender {
	return &ResendSender{
		client:         resend.NewClient(strings.TrimSpace(apiKey)),
		from:           strings.TrimSpace(from),
		supportAddress: strings.TrimSpace(supportAddress),
	}
}

func (s *ResendSender) SendSupport(ctx context.Context, submission db.LandingContactSubmission) (string, error) {
	if s == nil || s.from == "" || s.supportAddress == "" {
		return "", fmt.Errorf("landing contact email is not configured")
	}

	request := s.supportRequest(submission)
	contactID := pgutil.UUIDToString(submission.ID)
	response, err := s.client.Emails.SendWithOptions(ctx, request, &resend.SendEmailOptions{
		IdempotencyKey: "landing-contact-" + contactID,
	})
	if err != nil {
		return "", fmt.Errorf("send landing contact email: %w", err)
	}
	return response.Id, nil
}

func (s *ResendSender) supportRequest(submission db.LandingContactSubmission) *resend.SendEmailRequest {
	contactID := pgutil.UUIDToString(submission.ID)
	subjectName := strings.NewReplacer("\r", " ", "\n", " ").Replace(submission.Name)
	subject := "[Landing page] Contact from " + discord.Truncate(subjectName, 80)
	body := fmt.Sprintf(
		"STRIDO LANDING PAGE CONTACT\nSource: landing_page\nContact ID: %s\nName: %s\nEmail: %s\nLocale: %s\nPage: %s\n\n--- Message ---\n%s",
		contactID,
		submission.Name,
		submission.Email,
		emptyFallback(submission.Locale, "not captured"),
		emptyFallback(submission.PageUrl, "not captured"),
		submission.Message,
	)
	return &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{s.supportAddress},
		ReplyTo: submission.Email,
		Subject: subject,
		Text:    body,
		Headers: map[string]string{
			"X-Strido-Source":     "landing-page",
			"X-Strido-Contact-ID": contactID,
		},
	}
}

func (s *ResendSender) SendAcknowledgement(ctx context.Context, submission db.LandingContactSubmission) (string, error) {
	if s == nil || s.from == "" || s.supportAddress == "" {
		return "", fmt.Errorf("landing contact acknowledgement email is not configured")
	}

	request, err := s.acknowledgementRequest(submission)
	if err != nil {
		return "", err
	}

	contactID := pgutil.UUIDToString(submission.ID)
	response, err := s.client.Emails.SendWithOptions(ctx, request, &resend.SendEmailOptions{
		IdempotencyKey: "landing-contact-acknowledgement-" + contactID,
	})
	if err != nil {
		return "", fmt.Errorf("send landing contact acknowledgement email: %w", err)
	}
	return response.Id, nil
}

func (s *ResendSender) acknowledgementRequest(submission db.LandingContactSubmission) (*resend.SendEmailRequest, error) {
	loc := i18n.For(submission.Locale)
	rendered, err := emailtemplate.RenderTemplate(emailtemplate.TemplateNotification, emailtemplate.Message{
		Copy: emailtemplate.Copy{
			Preheader:  i18n.T(loc, "email.landing_contact_received.preheader"),
			Title:      i18n.T(loc, "email.landing_contact_received.title"),
			Intro:      i18n.T(loc, "email.landing_contact_received.intro", map[string]any{"Name": submission.Name}),
			Note:       i18n.T(loc, "email.landing_contact_received.note"),
			FooterNote: i18n.T(loc, "email.landing_contact_received.footer"),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("render landing contact acknowledgement email: %w", err)
	}

	contactID := pgutil.UUIDToString(submission.ID)
	return &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{submission.Email},
		ReplyTo: s.supportAddress,
		Subject: i18n.T(loc, "email.landing_contact_received.subject"),
		Text:    rendered.Text,
		Html:    rendered.HTML,
		Headers: map[string]string{
			"X-Strido-Source":     "landing-page-acknowledgement",
			"X-Strido-Contact-ID": contactID,
		},
	}, nil
}

func emptyFallback(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
