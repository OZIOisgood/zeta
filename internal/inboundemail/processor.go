package inboundemail

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/inbucket/html2text"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	maxStoredBodyLength = 200000
	maxDeliveryError    = 1000
)

func (h *Handler) processClaimed(ctx context.Context, row db.InboundEmail) (resultErr error) {
	log := logger.From(ctx, h.logger)
	defer func() {
		if err := h.q.ReleaseInboundEmailClaim(ctx, row.ID); err != nil {
			resultErr = errors.Join(resultErr, fmt.Errorf("release inbound email claim: %w", err))
		}
	}()

	email, err := h.provider.GetReceivedEmail(ctx, row.ResendEmailID)
	if err != nil {
		resultErr = errors.Join(resultErr, h.markFetchFailure(ctx, row, err))
		return resultErr
	}
	bodyText := normalizeBody(email.Text, email.HTML)
	attachments, err := json.Marshal(email.Attachments)
	if err != nil {
		resultErr = errors.Join(resultErr, fmt.Errorf("marshal attachment metadata: %w", err))
		return resultErr
	}
	if err := h.q.UpdateInboundEmailContent(ctx, db.UpdateInboundEmailContentParams{
		ID:          row.ID,
		Sender:      email.From,
		Recipients:  email.To,
		Cc:          email.Cc,
		Bcc:         email.Bcc,
		Subject:     email.Subject,
		MessageID:   email.MessageID,
		ReceivedAt:  pgtype.Timestamptz{Time: email.CreatedAt, Valid: true},
		BodyText:    bodyText,
		Attachments: attachments,
	}); err != nil {
		return fmt.Errorf("persist inbound email content: %w", err)
	}

	row.Sender = email.From
	row.Recipients = email.To
	row.Cc = email.Cc
	row.Bcc = email.Bcc
	row.Subject = email.Subject
	row.MessageID = email.MessageID
	row.ReceivedAt = pgtype.Timestamptz{Time: email.CreatedAt, Valid: true}
	row.BodyText = bodyText
	row.Attachments = attachments

	if row.DiscordStatus != "posted" {
		if err := h.deliverDiscord(ctx, row, email.Attachments); err != nil {
			resultErr = errors.Join(resultErr, err)
			log.ErrorContext(ctx, "inbound_email_discord_post_failed",
				slog.String("component", component),
				slog.String("inbound_email_id", uuidString(row.ID)),
				slog.Any("err", err),
			)
		}
	}
	if row.ForwardingStatus != "forwarded" && len(h.config.CopyRecipients) > 0 {
		if strings.TrimSpace(email.Text) == "" && strings.TrimSpace(email.HTML) == "" {
			email.Text = bodyText
		}
		if err := h.deliverForward(ctx, row, email); err != nil {
			resultErr = errors.Join(resultErr, err)
			log.ErrorContext(ctx, "inbound_email_forward_failed",
				slog.String("component", component),
				slog.String("inbound_email_id", uuidString(row.ID)),
				slog.Any("err", err),
			)
		}
	}
	return resultErr
}

func (h *Handler) deliverDiscord(ctx context.Context, row db.InboundEmail, attachments []Attachment) error {
	if h.discord == nil || row.DiscordChannelID == "" {
		err := fmt.Errorf("discord inbox integration is not configured")
		if updateErr := h.q.MarkInboundEmailDiscordFailed(ctx, db.MarkInboundEmailDiscordFailedParams{
			ID: row.ID, DiscordError: truncate(err.Error(), maxDeliveryError),
		}); updateErr != nil {
			return errors.Join(err, updateErr)
		}
		return err
	}

	thread, err := h.discord.CreateForumPost(ctx, row.DiscordChannelID, buildDiscordPost(row, attachments))
	if err != nil {
		if updateErr := h.q.MarkInboundEmailDiscordFailed(ctx, db.MarkInboundEmailDiscordFailedParams{
			ID: row.ID, DiscordError: truncate(err.Error(), maxDeliveryError),
		}); updateErr != nil {
			return errors.Join(err, updateErr)
		}
		return err
	}
	if err := h.q.MarkInboundEmailDiscordPosted(ctx, db.MarkInboundEmailDiscordPostedParams{
		ID: row.ID, DiscordThreadID: thread.ThreadID, DiscordMessageID: thread.MessageID,
	}); err != nil {
		return fmt.Errorf("persist discord delivery: %w", err)
	}
	return nil
}

func (h *Handler) deliverForward(ctx context.Context, row db.InboundEmail, email ReceivedEmail) error {
	if h.config.ForwardFrom == "" {
		err := fmt.Errorf("forwarding sender is not configured")
		if updateErr := h.q.MarkInboundEmailForwardingFailed(ctx, db.MarkInboundEmailForwardingFailedParams{
			ID: row.ID, ForwardingError: err.Error(),
		}); updateErr != nil {
			return errors.Join(err, updateErr)
		}
		return err
	}

	forwardID, err := h.provider.ForwardReceivedEmail(
		ctx,
		email,
		h.config.CopyRecipients,
		h.config.ForwardFrom,
		"inbound-forward-"+row.ResendEmailID,
	)
	if err != nil {
		if updateErr := h.q.MarkInboundEmailForwardingFailed(ctx, db.MarkInboundEmailForwardingFailedParams{
			ID: row.ID, ForwardingError: truncate(err.Error(), maxDeliveryError),
		}); updateErr != nil {
			return errors.Join(err, updateErr)
		}
		return err
	}
	if err := h.q.MarkInboundEmailForwarded(ctx, db.MarkInboundEmailForwardedParams{
		ID: row.ID, ForwardingEmailID: forwardID,
	}); err != nil {
		return fmt.Errorf("persist forwarding delivery: %w", err)
	}
	return nil
}

func (h *Handler) markFetchFailure(ctx context.Context, row db.InboundEmail, fetchErr error) error {
	var result error
	message := truncate(fetchErr.Error(), maxDeliveryError)
	if row.DiscordStatus != "posted" {
		result = errors.Join(result, h.q.MarkInboundEmailDiscordFailed(ctx, db.MarkInboundEmailDiscordFailedParams{
			ID: row.ID, DiscordError: message,
		}))
	}
	if row.ForwardingStatus != "forwarded" && len(h.config.CopyRecipients) > 0 {
		result = errors.Join(result, h.q.MarkInboundEmailForwardingFailed(ctx, db.MarkInboundEmailForwardingFailedParams{
			ID: row.ID, ForwardingError: message,
		}))
	}
	return errors.Join(fmt.Errorf("retrieve received email: %w", fetchErr), result)
}

func normalizeBody(text, html string) string {
	text = strings.TrimSpace(text)
	if text == "" && strings.TrimSpace(html) != "" {
		if converted, err := html2text.FromString(html, html2text.Options{TextOnly: true}); err == nil {
			text = strings.TrimSpace(converted)
		}
	}
	if text == "" {
		text = "(no plain-text body)"
	}
	return truncate(text, maxStoredBodyLength)
}

func buildDiscordPost(row db.InboundEmail, attachments []Attachment) discord.Post {
	sender := senderLabel(row.Sender)
	title := fmt.Sprintf("[%s] %s: %s", row.Inbox, sender, emptyFallback(row.Subject, "(no subject)"))

	var attachmentText strings.Builder
	if len(attachments) == 0 {
		attachmentText.WriteString("none")
	} else {
		for i, attachment := range attachments {
			if i > 0 {
				attachmentText.WriteString("\n")
			}
			fmt.Fprintf(&attachmentText, "- %s (%s", emptyFallback(attachment.Filename, "unnamed"), emptyFallback(attachment.ContentType, "unknown type"))
			if attachment.Size > 0 {
				fmt.Fprintf(&attachmentText, ", %s", formatBytes(attachment.Size))
			}
			attachmentText.WriteString(")")
		}
	}

	content := fmt.Sprintf(
		"**Inbox:** %s\n**From:** %s\n**To:** %s\n**Received:** %s\n**Subject:** %s\n**Inbound ID:** `%s`\n**Attachments:**\n%s\n\n%s",
		row.Inbox,
		row.Sender,
		strings.Join(row.Recipients, ", "),
		row.ReceivedAt.Time.UTC().Format("2006-01-02 15:04:05 UTC"),
		emptyFallback(row.Subject, "(no subject)"),
		uuidString(row.ID),
		attachmentText.String(),
		truncate(row.BodyText, 1200),
	)
	return discord.Post{Title: title, Content: content}
}
