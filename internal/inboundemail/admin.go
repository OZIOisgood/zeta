package inboundemail

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	emailtemplate "github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	defaultAdminListLimit = 50
	maxAdminListLimit     = 100
	maxReplyBodyLength    = 20000
)

type adminEmailListResponse struct {
	Items []adminEmailSummary `json:"items"`
	Total int64               `json:"total"`
}

type adminEmailSummary struct {
	ID              string     `json:"id"`
	Inbox           string     `json:"inbox"`
	InboxAddress    string     `json:"inbox_address"`
	Sender          string     `json:"sender"`
	SenderName      string     `json:"sender_name"`
	Subject         string     `json:"subject"`
	Preview         string     `json:"preview"`
	ReceivedAt      time.Time  `json:"received_at"`
	HandlingStatus  string     `json:"handling_status"`
	ReadAt          *time.Time `json:"read_at,omitempty"`
	AttachmentCount int        `json:"attachment_count"`
}

type adminEmailDetailResponse struct {
	adminEmailSummary
	Recipients  []string                  `json:"recipients"`
	Cc          []string                  `json:"cc"`
	BodyText    string                    `json:"body_text"`
	Attachments []Attachment              `json:"attachments"`
	Replies     []adminEmailReplyResponse `json:"replies"`
}

type adminEmailReplyResponse struct {
	ID                string     `json:"id"`
	FromAddress       string     `json:"from_address"`
	ToAddress         string     `json:"to_address"`
	Subject           string     `json:"subject"`
	BodyText          string     `json:"body_text"`
	SenderUserID      string     `json:"sender_user_id"`
	SenderDisplayName string     `json:"sender_display_name"`
	DeliveryStatus    string     `json:"delivery_status"`
	DeliveryError     string     `json:"delivery_error,omitempty"`
	SentAt            *time.Time `json:"sent_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}

type sendAdminReplyRequest struct {
	Body           string `json:"body"`
	IdempotencyKey string `json:"idempotency_key"`
}

type updateAdminEmailRequest struct {
	Status   string `json:"status"`
	MarkRead bool   `json:"mark_read"`
}

func (h *Handler) RegisterAdminRoutes(r chi.Router) {
	r.Get("/", h.ListAdminEmails)
	r.Get("/{id}", h.GetAdminEmail)
	r.Patch("/{id}", h.UpdateAdminEmail)
	r.Post("/{id}/replies", h.SendAdminReply)
	r.Get("/{id}/attachments/{attachmentID}", h.DownloadAdminAttachment)
}

func (h *Handler) ListAdminEmails(w http.ResponseWriter, r *http.Request) {
	if !requireInboundEmailPermission(w, r, permissions.InboundEmailRead) {
		return
	}
	inbox := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("inbox")))
	if inbox != "" && !validInbox(inbox) {
		http.Error(w, "invalid inbox", http.StatusBadRequest)
		return
	}
	status := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))
	if status != "" && !validHandlingStatus(status) {
		http.Error(w, "invalid status", http.StatusBadRequest)
		return
	}
	limit := boundedInt32(r.URL.Query().Get("limit"), defaultAdminListLimit, 1, maxAdminListLimit)
	offset := boundedInt32(r.URL.Query().Get("offset"), 0, 0, 100000)
	params := db.ListAdminInboundEmailsParams{
		Inbox: inbox, HandlingStatus: status, PageLimit: limit, PageOffset: offset,
	}
	rows, err := h.q.ListAdminInboundEmails(r.Context(), params)
	if err != nil {
		h.logAdminError(r, "inbound_email_admin_list_failed", err)
		http.Error(w, "Failed to list inbound emails", http.StatusInternalServerError)
		return
	}
	total, err := h.q.CountAdminInboundEmails(r.Context(), db.CountAdminInboundEmailsParams{
		Inbox: inbox, HandlingStatus: status,
	})
	if err != nil {
		h.logAdminError(r, "inbound_email_admin_count_failed", err)
		http.Error(w, "Failed to list inbound emails", http.StatusInternalServerError)
		return
	}
	items := make([]adminEmailSummary, 0, len(rows))
	for _, row := range rows {
		items = append(items, toAdminEmailSummary(row))
	}
	writeJSON(w, http.StatusOK, adminEmailListResponse{Items: items, Total: total})
}

func (h *Handler) GetAdminEmail(w http.ResponseWriter, r *http.Request) {
	if !requireInboundEmailPermission(w, r, permissions.InboundEmailRead) {
		return
	}
	id, ok := adminEmailID(w, r)
	if !ok {
		return
	}
	row, err := h.q.GetAdminInboundEmail(r.Context(), id)
	if err != nil {
		writeAdminLookupError(w, err)
		return
	}
	replies, err := h.q.ListInboundEmailReplies(r.Context(), id)
	if err != nil {
		h.logAdminError(r, "inbound_email_admin_replies_list_failed", err)
		http.Error(w, "Failed to retrieve inbound email", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, toAdminEmailDetail(row, replies))
}

func (h *Handler) UpdateAdminEmail(w http.ResponseWriter, r *http.Request) {
	if !requireInboundEmailPermission(w, r, permissions.InboundEmailReply) {
		return
	}
	id, ok := adminEmailID(w, r)
	if !ok {
		return
	}
	var req updateAdminEmailRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	var (
		row db.InboundEmail
		err error
	)
	if status != "" {
		if !validHandlingStatus(status) {
			http.Error(w, "invalid status", http.StatusBadRequest)
			return
		}
		row, err = h.q.UpdateInboundEmailHandlingStatus(r.Context(), db.UpdateInboundEmailHandlingStatusParams{
			ID: id, HandlingStatus: status,
		})
	} else if req.MarkRead {
		row, err = h.q.MarkInboundEmailRead(r.Context(), id)
	} else {
		http.Error(w, "status or mark_read is required", http.StatusBadRequest)
		return
	}
	if err != nil {
		writeAdminLookupError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toAdminEmailSummary(row))
}

func (h *Handler) SendAdminReply(w http.ResponseWriter, r *http.Request) {
	if !requireInboundEmailPermission(w, r, permissions.InboundEmailReply) {
		return
	}
	if h.provider == nil {
		http.Error(w, "Email delivery is not configured", http.StatusServiceUnavailable)
		return
	}
	id, ok := adminEmailID(w, r)
	if !ok {
		return
	}
	var req sendAdminReplyRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxReplyBodyLength*4)).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	body := strings.TrimSpace(req.Body)
	if body == "" {
		http.Error(w, "body is required", http.StatusBadRequest)
		return
	}
	if len([]rune(body)) > maxReplyBodyLength {
		http.Error(w, "body is too long", http.StatusBadRequest)
		return
	}
	idempotencyKey, err := scanUUID(req.IdempotencyKey)
	if err != nil {
		http.Error(w, "valid idempotency_key is required", http.StatusBadRequest)
		return
	}
	row, err := h.q.GetAdminInboundEmail(r.Context(), id)
	if err != nil {
		writeAdminLookupError(w, err)
		return
	}
	toAddress := parseAddress(row.Sender)
	fromAddress := normalizeAddress(row.InboxAddress)
	route, routeOK := h.routeByTo[fromAddress]
	if toAddress == "" || !routeOK || route.Inbox != row.Inbox {
		http.Error(w, "Email addresses are not replyable", http.StatusUnprocessableEntity)
		return
	}
	user := auth.GetUser(r.Context())
	displayName := strings.TrimSpace(user.FirstName + " " + user.LastName)
	if displayName == "" {
		displayName = "Strido administrator"
	}
	subject := replySubject(row.Subject)
	reply, err := h.q.CreateInboundEmailReply(r.Context(), db.CreateInboundEmailReplyParams{
		InboundEmailID: id, IdempotencyKey: idempotencyKey,
		SenderUserID: user.ID, SenderDisplayName: displayName,
		FromAddress: fromAddress, ToAddress: toAddress, Subject: subject, BodyText: body,
	})
	if err != nil {
		h.logAdminError(r, "inbound_email_reply_persist_failed", err)
		http.Error(w, "Failed to save reply", http.StatusInternalServerError)
		return
	}
	if reply.InboundEmailID != id || reply.BodyText != body || reply.FromAddress != fromAddress || reply.ToAddress != toAddress {
		http.Error(w, "idempotency key was already used for another reply", http.StatusConflict)
		return
	}
	if reply.DeliveryStatus == "sent" {
		writeJSON(w, http.StatusOK, toAdminEmailReply(reply))
		return
	}

	inboxName := inboxDisplayName(row.Inbox)
	rendered, err := emailtemplate.RenderTemplate(emailtemplate.TemplateInboxReply, emailtemplate.Message{Copy: emailtemplate.Copy{
		Preheader:  "Reply from Strido " + inboxName,
		Title:      "Strido " + inboxName,
		Intro:      reply.BodyText,
		FooterNote: "Strido " + inboxName + " Team",
	}})
	if err != nil {
		h.failAdminReply(w, r, reply.ID, fmt.Errorf("render reply: %w", err))
		return
	}
	from := (&mail.Address{Name: "Strido " + inboxName, Address: fromAddress}).String()
	resendID, err := h.provider.SendReply(r.Context(), ReplyEmail{
		From: from, To: toAddress, ReplyTo: fromAddress, Subject: subject,
		Text: rendered.Text, HTML: rendered.HTML,
		InReplyTo:  cleanHeaderValue(row.MessageID),
		References: replyReferences(row.ReferencesHeader, row.MessageID),
	}, "inbound-reply-"+uuidString(idempotencyKey))
	if err != nil {
		h.failAdminReply(w, r, reply.ID, err)
		return
	}
	sent, err := h.q.MarkInboundEmailReplySent(r.Context(), db.MarkInboundEmailReplySentParams{
		ResendEmailID: resendID, ReplyID: reply.ID,
	})
	if err != nil {
		h.logAdminError(r, "inbound_email_reply_sent_persist_failed", err)
		http.Error(w, "Reply was sent but its status could not be saved", http.StatusInternalServerError)
		return
	}
	h.logAdminInfo(r, "inbound_email_reply_sent", slog.String("inbound_email_id", uuidString(id)), slog.String("reply_id", uuidString(reply.ID)), slog.String("inbox", row.Inbox))
	writeJSON(w, http.StatusCreated, toAdminEmailReplySent(sent))
}

func (h *Handler) DownloadAdminAttachment(w http.ResponseWriter, r *http.Request) {
	if !requireInboundEmailPermission(w, r, permissions.InboundEmailRead) {
		return
	}
	if h.provider == nil {
		http.Error(w, "Email delivery is not configured", http.StatusServiceUnavailable)
		return
	}
	id, ok := adminEmailID(w, r)
	if !ok {
		return
	}
	row, err := h.q.GetAdminInboundEmail(r.Context(), id)
	if err != nil {
		writeAdminLookupError(w, err)
		return
	}
	attachmentID := strings.TrimSpace(chi.URLParam(r, "attachmentID"))
	var attachments []Attachment
	if err := json.Unmarshal(row.Attachments, &attachments); err != nil {
		h.logAdminError(r, "inbound_email_attachment_metadata_invalid", err)
		http.Error(w, "Attachment metadata is unavailable", http.StatusInternalServerError)
		return
	}
	found := false
	for _, attachment := range attachments {
		if attachment.ID == attachmentID {
			found = true
			break
		}
	}
	if !found {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}
	attachment, err := h.provider.GetReceivedAttachment(r.Context(), row.ResendEmailID, attachmentID)
	if err != nil || strings.TrimSpace(attachment.DownloadURL) == "" {
		if err == nil {
			err = errors.New("attachment download URL is empty")
		}
		h.logAdminError(r, "inbound_email_attachment_fetch_failed", err)
		http.Error(w, "Failed to retrieve attachment", http.StatusBadGateway)
		return
	}
	http.Redirect(w, r, attachment.DownloadURL, http.StatusFound)
}

func (h *Handler) failAdminReply(w http.ResponseWriter, r *http.Request, replyID pgtype.UUID, sendErr error) {
	_, persistErr := h.q.MarkInboundEmailReplyFailed(r.Context(), db.MarkInboundEmailReplyFailedParams{
		DeliveryError: truncate(sendErr.Error(), maxDeliveryError), ReplyID: replyID,
	})
	h.logAdminError(r, "inbound_email_reply_send_failed", errors.Join(sendErr, persistErr))
	http.Error(w, "Failed to send reply", http.StatusBadGateway)
}

func (h *Handler) logAdminError(r *http.Request, event string, err error) {
	logger.From(r.Context(), h.logger).ErrorContext(r.Context(), event,
		slog.String("component", component), slog.Any("err", err))
}

func (h *Handler) logAdminInfo(r *http.Request, event string, attrs ...slog.Attr) {
	base := []slog.Attr{slog.String("component", component)}
	logger.From(r.Context(), h.logger).LogAttrs(r.Context(), slog.LevelInfo, event, append(base, attrs...)...)
}

func requireInboundEmailPermission(w http.ResponseWriter, r *http.Request, permission string) bool {
	user := auth.GetUser(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return false
	}
	if !permissions.HasPermission(user.Permissions, permission) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return false
	}
	return true
}

func adminEmailID(w http.ResponseWriter, r *http.Request) (pgtype.UUID, bool) {
	id, err := scanUUID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid inbound email ID", http.StatusBadRequest)
		return pgtype.UUID{}, false
	}
	return id, true
}

func scanUUID(value string) (pgtype.UUID, error) {
	var id pgtype.UUID
	if err := id.Scan(strings.TrimSpace(value)); err != nil || !id.Valid {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID")
	}
	return id, nil
}

func writeAdminLookupError(w http.ResponseWriter, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "Inbound email not found", http.StatusNotFound)
		return
	}
	http.Error(w, "Failed to retrieve inbound email", http.StatusInternalServerError)
}

func toAdminEmailSummary(row db.InboundEmail) adminEmailSummary {
	attachments := decodeAttachments(row.Attachments)
	return adminEmailSummary{
		ID: uuidString(row.ID), Inbox: row.Inbox, InboxAddress: row.InboxAddress,
		Sender: row.Sender, SenderName: senderLabel(row.Sender),
		Subject: emptyFallback(row.Subject, "(no subject)"), Preview: truncate(row.BodyText, 180),
		ReceivedAt: row.ReceivedAt.Time, HandlingStatus: row.HandlingStatus,
		ReadAt: optionalTime(row.ReadAt), AttachmentCount: len(attachments),
	}
}

func toAdminEmailDetail(row db.InboundEmail, replies []db.InboundEmailReply) adminEmailDetailResponse {
	result := adminEmailDetailResponse{
		adminEmailSummary: toAdminEmailSummary(row), Recipients: row.Recipients,
		Cc: row.Cc, BodyText: row.BodyText, Attachments: decodeAttachments(row.Attachments),
		Replies: make([]adminEmailReplyResponse, 0, len(replies)),
	}
	for _, reply := range replies {
		result.Replies = append(result.Replies, toAdminEmailReply(reply))
	}
	return result
}

func toAdminEmailReply(row db.InboundEmailReply) adminEmailReplyResponse {
	return adminEmailReplyResponse{
		ID: uuidString(row.ID), FromAddress: row.FromAddress, ToAddress: row.ToAddress,
		Subject: row.Subject, BodyText: row.BodyText, SenderUserID: row.SenderUserID,
		SenderDisplayName: row.SenderDisplayName, DeliveryStatus: row.DeliveryStatus,
		DeliveryError: row.DeliveryError, SentAt: optionalTime(row.SentAt), CreatedAt: row.CreatedAt.Time,
	}
}

func toAdminEmailReplySent(row db.MarkInboundEmailReplySentRow) adminEmailReplyResponse {
	return adminEmailReplyResponse{
		ID: uuidString(row.ID), FromAddress: row.FromAddress, ToAddress: row.ToAddress,
		Subject: row.Subject, BodyText: row.BodyText, SenderUserID: row.SenderUserID,
		SenderDisplayName: row.SenderDisplayName, DeliveryStatus: row.DeliveryStatus,
		DeliveryError: row.DeliveryError, SentAt: optionalTime(row.SentAt), CreatedAt: row.CreatedAt.Time,
	}
}

func decodeAttachments(raw []byte) []Attachment {
	var attachments []Attachment
	if err := json.Unmarshal(raw, &attachments); err != nil || attachments == nil {
		return []Attachment{}
	}
	return attachments
}

func optionalTime(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time
	return &result
}

func validInbox(value string) bool {
	return value == "support" || value == "social" || value == "dsa"
}

func validHandlingStatus(value string) bool {
	return value == "open" || value == "replied" || value == "closed"
}

func boundedInt32(value string, fallback, minimum, maximum int) int32 {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed < minimum || parsed > maximum {
		return int32(fallback)
	}
	return int32(parsed)
}

func replySubject(subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return "Re: (no subject)"
	}
	if strings.HasPrefix(strings.ToLower(subject), "re:") {
		return subject
	}
	return "Re: " + subject
}

func replyReferences(references, messageID string) string {
	values := strings.Fields(cleanHeaderValue(references))
	messageID = cleanHeaderValue(messageID)
	if messageID != "" && (len(values) == 0 || values[len(values)-1] != messageID) {
		values = append(values, messageID)
	}
	return truncate(strings.Join(values, " "), 4000)
}

func cleanHeaderValue(value string) string {
	return strings.Join(strings.Fields(strings.ReplaceAll(strings.ReplaceAll(value, "\r", " "), "\n", " ")), " ")
}
