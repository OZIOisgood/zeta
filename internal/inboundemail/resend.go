package inboundemail

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/resend/resend-go/v3"
)

type ResendProvider struct {
	client *resend.Client
}

func NewResendProvider(apiKey string) *ResendProvider {
	return &ResendProvider{client: resend.NewClient(apiKey)}
}

func (p *ResendProvider) VerifyWebhook(payload []byte, headers WebhookHeaders, signingSecret string) error {
	if p == nil || p.client == nil {
		return fmt.Errorf("resend client is not configured")
	}
	return p.client.Webhooks.Verify(&resend.VerifyWebhookOptions{
		Payload: string(payload),
		Headers: resend.WebhookHeaders{
			Id:        headers.ID,
			Timestamp: headers.Timestamp,
			Signature: headers.Signature,
		},
		WebhookSecret: strings.TrimSpace(signingSecret),
	})
}

func (p *ResendProvider) GetReceivedEmail(ctx context.Context, emailID string) (ReceivedEmail, error) {
	format := "cid"
	email, err := p.client.Emails.Receiving.GetWithOptions(ctx, emailID, &resend.GetReceivedEmailParams{HtmlFormat: &format})
	if err != nil {
		return ReceivedEmail{}, fmt.Errorf("retrieve received email: %w", err)
	}
	result, err := mapReceivedEmail(email.Id, email.From, email.To, email.Cc, email.Bcc, email.Subject, email.MessageId, email.CreatedAt, email.Text, email.Html)
	if err != nil {
		return ReceivedEmail{}, err
	}

	attachments, err := p.listAttachments(ctx, emailID)
	if err != nil {
		return ReceivedEmail{}, err
	}
	result.Attachments = attachments
	return result, nil
}

func (p *ResendProvider) ListReceivedEmails(ctx context.Context, limit int) ([]ReceivedEmail, error) {
	if limit <= 0 {
		limit = 100
	}
	response, err := p.client.Emails.Receiving.ListWithOptions(ctx, &resend.ListOptions{Limit: &limit})
	if err != nil {
		return nil, fmt.Errorf("list received emails: %w", err)
	}

	emails := make([]ReceivedEmail, 0, len(response.Data))
	for _, item := range response.Data {
		email, err := mapReceivedEmail(item.Id, item.From, item.To, item.Cc, item.Bcc, item.Subject, item.MessageId, item.CreatedAt, "", "")
		if err != nil {
			return nil, err
		}
		for _, attachment := range item.Attachments {
			email.Attachments = append(email.Attachments, Attachment{
				ID:                 attachment.Id,
				Filename:           attachment.Filename,
				ContentType:        attachment.ContentType,
				ContentDisposition: attachment.ContentDisposition,
				ContentID:          attachment.ContentId,
			})
		}
		emails = append(emails, email)
	}
	return emails, nil
}

func (p *ResendProvider) ForwardReceivedEmail(ctx context.Context, email ReceivedEmail, recipients []string, from, idempotencyKey string) (string, error) {
	attachments := make([]*resend.Attachment, 0, len(email.Attachments))
	for _, attachment := range email.Attachments {
		if attachment.DownloadURL == "" {
			continue
		}
		attachments = append(attachments, &resend.Attachment{
			Path:        attachment.DownloadURL,
			Filename:    attachment.Filename,
			ContentType: attachment.ContentType,
			ContentId:   strings.Trim(attachment.ContentID, "<>"),
		})
	}

	params := &resend.SendEmailRequest{
		From:        from,
		To:          recipients,
		Subject:     forwardSubject(email.Subject),
		Text:        email.Text,
		Html:        email.HTML,
		Attachments: attachments,
		Headers: map[string]string{
			"X-Strido-Forwarded-Resend-ID": email.ID,
		},
	}
	if address := parseAddress(email.From); address != "" {
		params.ReplyTo = address
	}

	response, err := p.client.Emails.SendWithOptions(ctx, params, &resend.SendEmailOptions{IdempotencyKey: idempotencyKey})
	if err != nil {
		return "", fmt.Errorf("forward received email: %w", err)
	}
	return response.Id, nil
}

type attachmentListResponse struct {
	Data []struct {
		ID                 string `json:"id"`
		Filename           string `json:"filename"`
		Size               int64  `json:"size"`
		ContentType        string `json:"content_type"`
		ContentDisposition string `json:"content_disposition"`
		ContentID          string `json:"content_id"`
		DownloadURL        string `json:"download_url"`
	} `json:"data"`
}

func (p *ResendProvider) listAttachments(ctx context.Context, emailID string) ([]Attachment, error) {
	req, err := p.client.NewRequest(ctx, http.MethodGet, "emails/receiving/"+emailID+"/attachments", nil)
	if err != nil {
		return nil, fmt.Errorf("create received attachment request: %w", err)
	}
	var response attachmentListResponse
	if _, err := p.client.Perform(req, &response); err != nil {
		return nil, fmt.Errorf("list received attachments: %w", err)
	}

	attachments := make([]Attachment, 0, len(response.Data))
	for _, item := range response.Data {
		attachments = append(attachments, Attachment{
			ID:                 item.ID,
			Filename:           item.Filename,
			Size:               item.Size,
			ContentType:        item.ContentType,
			ContentDisposition: item.ContentDisposition,
			ContentID:          item.ContentID,
			DownloadURL:        item.DownloadURL,
		})
	}
	return attachments, nil
}

func mapReceivedEmail(id, from string, to, cc, bcc []string, subject, messageID, createdAt, text, html string) (ReceivedEmail, error) {
	receivedAt, err := time.Parse(time.RFC3339Nano, createdAt)
	if err != nil {
		return ReceivedEmail{}, fmt.Errorf("parse received email timestamp: %w", err)
	}
	return ReceivedEmail{
		ID:        id,
		From:      from,
		To:        to,
		Cc:        cc,
		Bcc:       bcc,
		Subject:   subject,
		MessageID: messageID,
		CreatedAt: receivedAt,
		Text:      text,
		HTML:      html,
	}, nil
}

func forwardSubject(subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return "Fwd: (no subject)"
	}
	return "Fwd: " + subject
}
