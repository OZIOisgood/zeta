package feedback

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/go-chi/chi/v5"
)

const (
	component          = "feedback"
	maxMessageLength   = 4000
	maxPageURLLength   = 1024
	maxUserAgentLength = 512
	maxErrorLength     = 1000
)

type Store interface {
	CreateFeedbackSubmission(ctx context.Context, arg db.CreateFeedbackSubmissionParams) (db.FeedbackSubmission, error)
	MarkFeedbackDiscordPosted(ctx context.Context, arg db.MarkFeedbackDiscordPostedParams) error
	MarkFeedbackDiscordFailed(ctx context.Context, arg db.MarkFeedbackDiscordFailedParams) error
	MarkFeedbackDiscordSkipped(ctx context.Context, arg db.MarkFeedbackDiscordSkippedParams) error
}

type Handler struct {
	q                Store
	discord          DiscordPoster
	logger           *slog.Logger
	discordChannelID string
}

type HandlerConfig struct {
	DiscordChannelID string
}

func NewHandler(q Store, discord DiscordPoster, logger *slog.Logger, cfg HandlerConfig) *Handler {
	return &Handler{
		q:                q,
		discord:          discord,
		logger:           logger,
		discordChannelID: strings.TrimSpace(cfg.DiscordChannelID),
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.Create)
}

type createRequest struct {
	Rating  int    `json:"rating"`
	Message string `json:"message"`
	PageURL string `json:"page_url"`
}

type createResponse struct {
	ID            string `json:"id"`
	DiscordStatus string `json:"discord_status"`
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	message := strings.TrimSpace(req.Message)
	if req.Rating < 1 || req.Rating > 5 {
		http.Error(w, "rating must be between 1 and 5", http.StatusBadRequest)
		return
	}
	if message == "" {
		http.Error(w, "message is required", http.StatusBadRequest)
		return
	}
	if len([]rune(message)) > maxMessageLength {
		http.Error(w, "message is too long", http.StatusBadRequest)
		return
	}

	displayName := strings.TrimSpace(user.FirstName + " " + user.LastName)
	if displayName == "" {
		displayName = "User"
	}

	row, err := h.q.CreateFeedbackSubmission(ctx, db.CreateFeedbackSubmissionParams{
		UserID:           user.ID,
		UserDisplayName:  displayName,
		Rating:           int32(req.Rating),
		Message:          message,
		PageUrl:          truncate(req.PageURL, maxPageURLLength),
		UserAgent:        truncate(r.UserAgent(), maxUserAgentLength),
		DiscordChannelID: h.discordChannelID,
	})
	if err != nil {
		log.ErrorContext(ctx, "feedback_submission_create_failed",
			slog.String("component", component),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to save feedback", http.StatusInternalServerError)
		return
	}

	status := h.deliverDiscord(ctx, log, row)
	log.InfoContext(ctx, "feedback_submission_created",
		slog.String("component", component),
		slog.String("feedback_id", pgutil.UUIDToString(row.ID)),
		slog.String("user_id", user.ID),
		slog.Int("rating", req.Rating),
		slog.String("discord_status", status),
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createResponse{
		ID:            pgutil.UUIDToString(row.ID),
		DiscordStatus: status,
	})
}

func (h *Handler) deliverDiscord(ctx context.Context, log *slog.Logger, row db.FeedbackSubmission) string {
	feedbackID := pgutil.UUIDToString(row.ID)
	if h.discord == nil || h.discordChannelID == "" {
		reason := "discord feedback integration is not configured"
		if err := h.q.MarkFeedbackDiscordSkipped(ctx, db.MarkFeedbackDiscordSkippedParams{
			ID:           row.ID,
			DiscordError: reason,
		}); err != nil {
			log.WarnContext(ctx, "feedback_discord_skip_update_failed",
				slog.String("component", component),
				slog.String("feedback_id", feedbackID),
				slog.Any("err", err),
			)
		}
		return "skipped"
	}

	thread, err := h.discord.CreateForumPost(ctx, h.discordChannelID, buildDiscordPost(row))
	if err != nil {
		errorMessage := truncate(err.Error(), maxErrorLength)
		if updateErr := h.q.MarkFeedbackDiscordFailed(ctx, db.MarkFeedbackDiscordFailedParams{
			ID:           row.ID,
			DiscordError: errorMessage,
		}); updateErr != nil {
			log.WarnContext(ctx, "feedback_discord_failure_update_failed",
				slog.String("component", component),
				slog.String("feedback_id", feedbackID),
				slog.Any("err", updateErr),
			)
		}
		log.ErrorContext(ctx, "feedback_discord_post_failed",
			slog.String("component", component),
			slog.String("feedback_id", feedbackID),
			slog.Any("err", err),
		)
		return "failed"
	}

	if err := h.q.MarkFeedbackDiscordPosted(ctx, db.MarkFeedbackDiscordPostedParams{
		ID:               row.ID,
		DiscordThreadID:  thread.ThreadID,
		DiscordMessageID: thread.MessageID,
	}); err != nil {
		log.WarnContext(ctx, "feedback_discord_success_update_failed",
			slog.String("component", component),
			slog.String("feedback_id", feedbackID),
			slog.String("discord_thread_id", thread.ThreadID),
			slog.String("discord_message_id", thread.MessageID),
			slog.Any("err", err),
		)
	}

	return "posted"
}

func buildDiscordPost(row db.FeedbackSubmission) DiscordPost {
	feedbackID := pgutil.UUIDToString(row.ID)
	title := fmt.Sprintf("%d/5 feedback from %s", row.Rating, row.UserDisplayName)
	content := fmt.Sprintf(
		"**Rating:** %d/5\n**User:** %s (`%s`)\n**Feedback ID:** `%s`\n**Page:** %s\n\n%s",
		row.Rating,
		row.UserDisplayName,
		row.UserID,
		feedbackID,
		emptyFallback(row.PageUrl, "not captured"),
		row.Message,
	)
	return DiscordPost{Title: title, Content: content}
}

func emptyFallback(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
