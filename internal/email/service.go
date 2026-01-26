package email

import (
	"fmt"

	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/resend/resend-go/v2"
)

type Service struct {
	client *resend.Client
}

func NewService() *Service {
	apiKey := tools.GetEnv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)
	return &Service{
		client: client,
	}
}

func (s *Service) Send(to []string, subject string, text string) error {
	fmt.Printf("[Email Service] Preparing to send email to %v\n", to)
	params := &resend.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      to,
		Subject: subject,
		Text:    text,
	}

	resp, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[Email Service] Failed to send email: %v\n", err)
		return fmt.Errorf("failed to send email: %w", err)
	}
	fmt.Printf("[Email Service] Email sent, ID: %s\n", resp.Id)
	return nil
}
