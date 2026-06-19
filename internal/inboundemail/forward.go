package inboundemail

import (
	"fmt"
	"html"
	"net/mail"
	"strings"
)

type forwardContent struct {
	Text string
	HTML string
}

func buildForwardContent(email ReceivedEmail, metadata ForwardMetadata) forwardContent {
	inboxName := inboxDisplayName(metadata.Inbox)
	inboxAddress := strings.TrimSpace(metadata.InboxAddress)
	if inboxAddress == "" {
		inboxAddress = strings.Join(email.To, ", ")
	}
	receivedAt := "unknown"
	if !email.CreatedAt.IsZero() {
		receivedAt = email.CreatedAt.UTC().Format("2006-01-02 15:04:05 UTC")
	}

	textBanner := fmt.Sprintf(
		"STRIDO %s INBOX\nOriginally sent to: %s\nOriginal sender: %s\nReceived: %s\nReplying will address the original sender.\n\n--- Original message ---",
		strings.ToUpper(inboxName),
		emptyFallback(inboxAddress, "unknown"),
		emptyFallback(email.From, "unknown"),
		receivedAt,
	)
	originalText := strings.TrimSpace(email.Text)
	if originalText == "" {
		originalText = "(HTML message; see the HTML version.)"
	}

	htmlBanner := fmt.Sprintf(
		`<div style="margin:0 0 20px;padding:16px;border-left:4px solid #f97316;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif;font-size:14px;line-height:1.5"><div style="margin:0 0 10px;font-size:16px;font-weight:700">Strido %s Inbox</div><table role="presentation" style="border-collapse:collapse;color:#3f3f46;font-size:14px"><tr><td style="padding:2px 12px 2px 0;font-weight:700">Originally sent to</td><td style="padding:2px 0">%s</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:700">Original sender</td><td style="padding:2px 0">%s</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:700">Received</td><td style="padding:2px 0">%s</td></tr></table><div style="margin-top:10px;color:#71717a;font-size:12px">Replying will address the original sender.</div></div>`,
		html.EscapeString(inboxName),
		html.EscapeString(emptyFallback(inboxAddress, "unknown")),
		html.EscapeString(emptyFallback(email.From, "unknown")),
		html.EscapeString(receivedAt),
	)

	return forwardContent{
		Text: textBanner + "\n\n" + originalText,
		HTML: prependHTMLBanner(email.HTML, htmlBanner, email.Text),
	}
}

func prependHTMLBanner(originalHTML, banner, originalText string) string {
	if strings.TrimSpace(originalHTML) == "" {
		body := html.EscapeString(strings.TrimSpace(originalText))
		body = strings.ReplaceAll(body, "\n", "<br>")
		return banner + `<div style="white-space:normal;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">` + body + `</div>`
	}

	lower := strings.ToLower(originalHTML)
	if bodyStart := strings.Index(lower, "<body"); bodyStart >= 0 {
		if bodyEnd := strings.Index(lower[bodyStart:], ">"); bodyEnd >= 0 {
			insertAt := bodyStart + bodyEnd + 1
			return originalHTML[:insertAt] + banner + originalHTML[insertAt:]
		}
	}
	return banner + `<div style="margin-top:20px">` + originalHTML + `</div>`
}

func forwardFrom(from, inbox string) string {
	parsed, err := mail.ParseAddress(strings.TrimSpace(from))
	if err != nil || parsed.Address == "" {
		return from
	}
	return (&mail.Address{
		Name:    "Strido " + inboxDisplayName(inbox) + " Inbox",
		Address: parsed.Address,
	}).String()
}

func forwardSubject(inbox, subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		subject = "(no subject)"
	}
	return fmt.Sprintf("[%s] Fwd: %s", inboxDisplayName(inbox), subject)
}

func inboxDisplayName(inbox string) string {
	switch strings.ToLower(strings.TrimSpace(inbox)) {
	case "social":
		return "Social"
	case "support":
		return "Support"
	case "dsa":
		return "DSA"
	default:
		return "Inbound"
	}
}
