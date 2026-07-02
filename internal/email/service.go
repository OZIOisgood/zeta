package email

import (
	"fmt"
	"log/slog"

	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/resend/resend-go/v3"
)

//go:generate mockgen -source=service.go -destination=mocks/mock_sender.go -package=mocks

// Sender is the interface for sending emails.
type Sender interface {
	Send(to []string, subject string, text string) error
	SendTemplate(to []string, subject string, templateName TemplateName, message Message) error
}

type Service struct {
	client *resend.Client
	logger *slog.Logger
	from   string
}

func NewService(logger *slog.Logger) *Service {
	apiKey := tools.GetEnv("RESEND_API_KEY")
	from := tools.GetEnv("RESEND_FROM_EMAIL")
	client := resend.NewClient(apiKey)
	return &Service{
		client: client,
		logger: logger,
		from:   from,
	}
}

func (s *Service) Send(to []string, subject string, text string) error {
	return s.send(to, subject, text, "")
}

func (s *Service) SendTemplate(to []string, subject string, templateName TemplateName, message Message) error {
	rendered, err := RenderTemplate(templateName, message)
	if err != nil {
		return fmt.Errorf("render email template %q: %w", templateName, err)
	}
	return s.send(to, subject, rendered.Text, rendered.HTML)
}

func (s *Service) send(to []string, subject string, text string, html string) error {
	s.logger.Info("email_send_initiated",
		slog.String("component", "email_service"),
		slog.Int("recipient_count", len(to)),
		slog.String("subject", subject),
		slog.Bool("has_html", html != ""),
	)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      to,
		Subject: subject,
		Text:    text,
		Html:    html,
	}

	resp, err := s.client.Emails.Send(params)
	if err != nil {
		s.logger.Error("email_send_failed",
			slog.String("component", "email_service"),
			slog.Any("err", err),
			slog.Int("recipient_count", len(to)),
		)
		return fmt.Errorf("send email: %w", err)
	}

	s.logger.Info("email_send_succeeded",
		slog.String("component", "email_service"),
		slog.String("email_id", resp.Id),
	)
	return nil
}
