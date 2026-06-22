package contact

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/go-chi/chi/v5"
)

const (
	component          = "landing_contact"
	maxRequestBytes    = 16 * 1024
	maxNameLength      = 120
	maxEmailLength     = 254
	maxMessageLength   = 5000
	maxLocaleLength    = 16
	maxPageURLLength   = 1024
	maxUserAgentLength = 512
	maxErrorLength     = 1000
)

type Store interface {
	CreateLandingContactSubmission(ctx context.Context, arg db.CreateLandingContactSubmissionParams) (db.LandingContactSubmission, error)
	MarkLandingContactEmailSent(ctx context.Context, arg db.MarkLandingContactEmailSentParams) error
	MarkLandingContactEmailFailed(ctx context.Context, arg db.MarkLandingContactEmailFailedParams) error
}

type EmailSender interface {
	SendSupport(ctx context.Context, submission db.LandingContactSubmission) (string, error)
	SendAcknowledgement(ctx context.Context, submission db.LandingContactSubmission) (string, error)
}

type Handler struct {
	q       Store
	email   EmailSender
	logger  *slog.Logger
	limiter *rateLimiter
}

func NewHandler(q Store, email EmailSender, baseLogger *slog.Logger) *Handler {
	return &Handler{
		q:       q,
		email:   email,
		logger:  baseLogger,
		limiter: newRateLimiter(3, 10*time.Minute),
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.Create)
}

type createRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
	Locale  string `json:"locale"`
	PageURL string `json:"page_url"`
	Website string `json:"website"`
}

type createResponse struct {
	ID string `json:"id"`
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req createRequest
	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Quietly accept honeypot submissions so automated senders do not learn how to bypass it.
	if strings.TrimSpace(req.Website) != "" {
		writeCreated(w, "")
		return
	}

	name := strings.TrimSpace(req.Name)
	emailAddress, err := normalizeEmail(req.Email)
	message := strings.TrimSpace(req.Message)
	locale := strings.TrimSpace(req.Locale)
	if name == "" || runeLen(name) > maxNameLength {
		http.Error(w, "name is required and must be at most 120 characters", http.StatusBadRequest)
		return
	}
	if err != nil || runeLen(emailAddress) > maxEmailLength {
		http.Error(w, "a valid email address is required", http.StatusBadRequest)
		return
	}
	if message == "" || runeLen(message) > maxMessageLength {
		http.Error(w, "message is required and must be at most 5000 characters", http.StatusBadRequest)
		return
	}
	if runeLen(locale) > maxLocaleLength {
		http.Error(w, "locale is too long", http.StatusBadRequest)
		return
	}

	if !h.limiter.Allow(rateLimitKey(r), time.Now()) {
		w.Header().Set("Retry-After", "600")
		http.Error(w, "Too many contact requests", http.StatusTooManyRequests)
		return
	}

	row, err := h.q.CreateLandingContactSubmission(ctx, db.CreateLandingContactSubmissionParams{
		Name:      name,
		Email:     emailAddress,
		Message:   message,
		Locale:    locale,
		PageUrl:   discord.Truncate(req.PageURL, maxPageURLLength),
		UserAgent: discord.Truncate(r.UserAgent(), maxUserAgentLength),
	})
	if err != nil {
		log.ErrorContext(ctx, "landing_contact_submission_create_failed",
			slog.String("component", component),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to save contact request", http.StatusInternalServerError)
		return
	}

	contactID := pgutil.UUIDToString(row.ID)
	if h.email == nil {
		handleDeliveryFailure(ctx, h.q, log, row, errors.New("landing contact email is not configured"))
		http.Error(w, "Failed to send contact request", http.StatusBadGateway)
		return
	}

	resendID, err := h.email.SendSupport(ctx, row)
	if err != nil {
		handleDeliveryFailure(ctx, h.q, log, row, err)
		http.Error(w, "Failed to send contact request", http.StatusBadGateway)
		return
	}

	if err := h.q.MarkLandingContactEmailSent(ctx, db.MarkLandingContactEmailSentParams{
		ID: row.ID, ResendEmailID: resendID,
	}); err != nil {
		log.WarnContext(ctx, "landing_contact_email_success_update_failed",
			slog.String("component", component),
			slog.String("contact_id", contactID),
			slog.String("resend_email_id", resendID),
			slog.Any("err", err),
		)
	}

	acknowledgementID, err := h.email.SendAcknowledgement(ctx, row)
	if err != nil {
		log.WarnContext(ctx, "landing_contact_acknowledgement_send_failed",
			slog.String("component", component),
			slog.String("contact_id", contactID),
			slog.Any("err", err),
		)
	} else {
		log.InfoContext(ctx, "landing_contact_acknowledgement_sent",
			slog.String("component", component),
			slog.String("contact_id", contactID),
			slog.String("resend_email_id", acknowledgementID),
		)
	}

	log.InfoContext(ctx, "landing_contact_submission_created",
		slog.String("component", component),
		slog.String("contact_id", contactID),
		slog.String("resend_email_id", resendID),
	)
	writeCreated(w, contactID)
}

func handleDeliveryFailure(ctx context.Context, q Store, log *slog.Logger, row db.LandingContactSubmission, deliveryErr error) {
	contactID := pgutil.UUIDToString(row.ID)
	if updateErr := q.MarkLandingContactEmailFailed(ctx, db.MarkLandingContactEmailFailedParams{
		ID: row.ID, EmailError: discord.Truncate(deliveryErr.Error(), maxErrorLength),
	}); updateErr != nil {
		log.WarnContext(ctx, "landing_contact_email_failure_update_failed",
			slog.String("component", component),
			slog.String("contact_id", contactID),
			slog.Any("err", updateErr),
		)
	}
	log.ErrorContext(ctx, "landing_contact_email_send_failed",
		slog.String("component", component),
		slog.String("contact_id", contactID),
		slog.Any("err", deliveryErr),
	)
}

func normalizeEmail(value string) (string, error) {
	parsed, err := mail.ParseAddress(strings.TrimSpace(value))
	if err != nil || parsed.Address == "" || strings.ContainsAny(parsed.Address, "\r\n") {
		return "", errors.New("invalid email address")
	}
	return strings.ToLower(parsed.Address), nil
}

func runeLen(value string) int {
	return len([]rune(value))
}

func writeCreated(w http.ResponseWriter, id string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createResponse{ID: id})
}
