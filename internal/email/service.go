package email

import (
	"fmt"
	"log/slog"

	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/resend/resend-go/v2"
)

type Service struct {
	client *resend.Client
	logger *slog.Logger
}

func NewService(logger *slog.Logger) *Service {
	apiKey := tools.GetEnv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)
	return &Service{
		client: client,
		logger: logger,
	}
}

func (s *Service) Send(to []string, subject string, text string) error {
	s.logger.Info("email_send_initiated",
		slog.String("component", "email_service"),
		slog.Any("to", to),
		slog.String("subject", subject),
	)

	params := &resend.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      to,
		Subject: subject,
		Text:    text,
	}

	resp, err := s.client.Emails.Send(params)
	if err != nil {
		s.logger.Error("email_send_failed",
			slog.String("component", "email_service"),
			slog.Any("err", err),
			slog.Any("to", to),
		)
		return fmt.Errorf("send email: %w", err)
	}

	s.logger.Info("email_send_succeeded",
		slog.String("component", "email_service"),
		slog.String("email_id", resp.Id),
	)
	return nil
}
