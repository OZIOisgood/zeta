package contact

import (
	"context"
	"fmt"
	"strings"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
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

func (s *ResendSender) Send(ctx context.Context, submission db.LandingContactSubmission) (string, error) {
	if s == nil || s.from == "" || s.supportAddress == "" {
		return "", fmt.Errorf("landing contact email is not configured")
	}

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
	request := &resend.SendEmailRequest{
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
	response, err := s.client.Emails.SendWithOptions(ctx, request, &resend.SendEmailOptions{
		IdempotencyKey: "landing-contact-" + contactID,
	})
	if err != nil {
		return "", fmt.Errorf("send landing contact email: %w", err)
	}
	return response.Id, nil
}

func emptyFallback(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
