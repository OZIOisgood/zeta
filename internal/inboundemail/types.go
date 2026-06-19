package inboundemail

import (
	"context"
	"time"
)

type WebhookHeaders struct {
	ID        string
	Timestamp string
	Signature string
}

type Attachment struct {
	ID                 string `json:"id"`
	Filename           string `json:"filename"`
	ContentType        string `json:"content_type"`
	ContentDisposition string `json:"content_disposition,omitempty"`
	ContentID          string `json:"content_id,omitempty"`
	Size               int64  `json:"size,omitempty"`
	DownloadURL        string `json:"-"`
}

type ReceivedEmail struct {
	ID          string
	From        string
	To          []string
	Cc          []string
	Bcc         []string
	Subject     string
	MessageID   string
	CreatedAt   time.Time
	Text        string
	HTML        string
	Attachments []Attachment
}

type ForwardMetadata struct {
	Inbox        string
	InboxAddress string
}

type Provider interface {
	VerifyWebhook(payload []byte, headers WebhookHeaders, signingSecret string) error
	GetReceivedEmail(ctx context.Context, emailID string) (ReceivedEmail, error)
	ListReceivedEmails(ctx context.Context, limit int) ([]ReceivedEmail, error)
	ForwardReceivedEmail(ctx context.Context, email ReceivedEmail, metadata ForwardMetadata, recipients []string, from, idempotencyKey string) (string, error)
}

type Route struct {
	Inbox            string
	Address          string
	DiscordChannelID string
}

type Config struct {
	WebhookSigningSecret string
	ForwardFrom          string
	CopyRecipients       []string
	Routes               []Route
}
