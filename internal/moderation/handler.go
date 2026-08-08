package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/discord"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/go-chi/chi/v5"
	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	component                   = "moderation"
	maxDetailsLength            = 4000
	maxPageURLLength            = 1024
	maxUserAgentLength          = 512
	maxDiscordErrorLength       = 1000
	defaultListLimit      int32 = 50
	maxListLimit          int32 = 100
)

type Handler struct {
	q                db.Querier
	discord          discord.Poster
	logger           *slog.Logger
	discordChannelID string
}

type HandlerConfig struct {
	DiscordChannelID string
}

func NewHandler(q db.Querier, discordPoster discord.Poster, logger *slog.Logger, cfg HandlerConfig) *Handler {
	return &Handler{
		q:                q,
		discord:          discordPoster,
		logger:           logger,
		discordChannelID: strings.TrimSpace(cfg.DiscordChannelID),
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/reports", h.CreateReport)
	r.Get("/reports", h.ListReports)
	r.Patch("/reports/{id}", h.UpdateReport)
}

type createReportRequest struct {
	SubjectType string `json:"subject_type"`
	VideoID     string `json:"video_id"`
	ReviewID    string `json:"review_id"`
	Reason      string `json:"reason"`
	Details     string `json:"details"`
	PageURL     string `json:"page_url"`
}

type updateReportRequest struct {
	Status string `json:"status"`
}

type reportResponse struct {
	ID                  string     `json:"id"`
	ReporterUserID      string     `json:"reporter_user_id"`
	ReporterDisplayName string     `json:"reporter_display_name"`
	SubjectType         string     `json:"subject_type"`
	TargetReviewID      string     `json:"target_review_id,omitempty"`
	TargetVideoID       string     `json:"target_video_id,omitempty"`
	TargetUserID        string     `json:"target_user_id,omitempty"`
	TargetDisplayName   string     `json:"target_display_name,omitempty"`
	TargetReviewContent string     `json:"target_review_content"`
	Reason              string     `json:"reason"`
	Details             string     `json:"details"`
	PageURL             string     `json:"page_url"`
	Status              string     `json:"status"`
	ResolvedByUserID    string     `json:"resolved_by_user_id,omitempty"`
	ResolvedAt          *time.Time `json:"resolved_at,omitempty"`
	DiscordStatus       string     `json:"discord_status"`
	DiscordChannelID    string     `json:"discord_channel_id,omitempty"`
	DiscordThreadID     string     `json:"discord_thread_id,omitempty"`
	DiscordMessageID    string     `json:"discord_message_id,omitempty"`
	DiscordError        string     `json:"discord_error,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (h *Handler) CreateReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.ModerationReportsCreate) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req createReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	subjectType := strings.TrimSpace(req.SubjectType)
	if subjectType != "review_comment" && subjectType != "user" {
		http.Error(w, "subject_type must be review_comment or user", http.StatusBadRequest)
		return
	}
	reason := strings.TrimSpace(req.Reason)
	if !validReason(reason) {
		http.Error(w, "invalid reason", http.StatusBadRequest)
		return
	}
	details := strings.TrimSpace(req.Details)
	if len([]rune(details)) > maxDetailsLength {
		http.Error(w, "details are too long", http.StatusBadRequest)
		return
	}

	var requestedVideoID pgtype.UUID
	if err := requestedVideoID.Scan(req.VideoID); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}
	var reviewID pgtype.UUID
	if err := reviewID.Scan(req.ReviewID); err != nil {
		http.Error(w, "Invalid review ID", http.StatusBadRequest)
		return
	}

	target, err := h.q.GetReviewModerationTarget(ctx, reviewID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Review not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "moderation_report_target_fetch_failed",
			slog.String("component", component),
			slog.String("review_id", req.ReviewID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to validate report target", http.StatusInternalServerError)
		return
	}
	if target.VideoID != requestedVideoID {
		http.Error(w, "Review belongs to a different video", http.StatusBadRequest)
		return
	}
	if target.TargetUserID.String == "" {
		http.Error(w, "Review author is missing", http.StatusBadRequest)
		return
	}
	if target.TargetUserID.String == user.ID {
		http.Error(w, "Cannot report yourself", http.StatusBadRequest)
		return
	}

	visible, err := h.q.CheckVideoVisibleToUser(ctx, db.CheckVideoVisibleToUserParams{
		VideoID:   requestedVideoID,
		UserID:    user.ID,
		IsStudent: user.Role == permissions.RoleStudent,
	})
	if err != nil {
		log.ErrorContext(ctx, "moderation_report_visibility_check_failed",
			slog.String("component", component),
			slog.String("video_id", req.VideoID),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check video access", http.StatusInternalServerError)
		return
	}
	if !visible {
		http.Error(w, "Video not found", http.StatusNotFound)
		return
	}

	reporterName := strings.TrimSpace(user.FirstName + " " + user.LastName)
	if reporterName == "" {
		reporterName = "User"
	}

	row, err := h.q.CreateModerationReport(ctx, db.CreateModerationReportParams{
		ReporterUserID:      user.ID,
		ReporterDisplayName: reporterName,
		SubjectType:         subjectType,
		TargetReviewID:      reviewID,
		TargetVideoID:       requestedVideoID,
		TargetUserID:        target.TargetUserID.String,
		TargetDisplayName:   target.TargetDisplayName,
		TargetReviewContent: target.TargetReviewContent,
		Reason:              reason,
		Details:             details,
		PageUrl:             discord.Truncate(req.PageURL, maxPageURLLength),
		UserAgent:           discord.Truncate(r.UserAgent(), maxUserAgentLength),
		DiscordChannelID:    h.discordChannelID,
	})
	if err != nil {
		log.ErrorContext(ctx, "moderation_report_create_failed",
			slog.String("component", component),
			slog.String("user_id", user.ID),
			slog.String("review_id", req.ReviewID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to save report", http.StatusInternalServerError)
		return
	}

	status := h.deliverDiscord(ctx, log, row)
	row.DiscordStatus = status
	log.InfoContext(ctx, "moderation_report_created",
		slog.String("component", component),
		slog.String("report_id", pgutil.UUIDToString(row.ID)),
		slog.String("reporter_user_id", user.ID),
		slog.String("target_review_id", req.ReviewID),
		slog.String("subject_type", subjectType),
		slog.String("reason", reason),
		slog.String("discord_status", status),
	)

	writeJSON(w, http.StatusCreated, toResponse(row))
}

func (h *Handler) ListReports(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.ModerationReportsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	if statusFilter != "" && !validStatus(statusFilter) {
		http.Error(w, "invalid status", http.StatusBadRequest)
		return
	}
	subjectTypeFilter := strings.TrimSpace(r.URL.Query().Get("subject_type"))
	if subjectTypeFilter != "" && subjectTypeFilter != "review_comment" && subjectTypeFilter != "user" {
		http.Error(w, "invalid subject_type", http.StatusBadRequest)
		return
	}

	limit := parseBoundedInt32(r.URL.Query().Get("limit"), defaultListLimit, 1, maxListLimit)
	offset := parseBoundedInt32(r.URL.Query().Get("offset"), 0, 0, 100000)
	rows, err := h.q.ListModerationReports(r.Context(), db.ListModerationReportsParams{
		StatusFilter:      statusFilter,
		SubjectTypeFilter: subjectTypeFilter,
		LimitCount:        limit,
		OffsetCount:       offset,
	})
	if err != nil {
		log := logger.From(r.Context(), h.logger)
		log.ErrorContext(r.Context(), "moderation_reports_list_failed",
			slog.String("component", component),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list reports", http.StatusInternalServerError)
		return
	}
	resp := make([]reportResponse, len(rows))
	for i, row := range rows {
		resp[i] = toResponse(row)
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) UpdateReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.ModerationReportsUpdate) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var reportID pgtype.UUID
	if err := reportID.Scan(chi.URLParam(r, "id")); err != nil {
		http.Error(w, "Invalid report ID", http.StatusBadRequest)
		return
	}
	var req updateReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	status := strings.TrimSpace(req.Status)
	if status != "resolved" && status != "rejected" {
		http.Error(w, "status must be resolved or rejected", http.StatusBadRequest)
		return
	}

	row, err := h.q.UpdateModerationReportStatus(ctx, db.UpdateModerationReportStatusParams{
		ID:               reportID,
		Status:           status,
		ResolvedByUserID: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Report not found or already closed", http.StatusConflict)
			return
		}
		log.ErrorContext(ctx, "moderation_report_update_failed",
			slog.String("component", component),
			slog.String("report_id", chi.URLParam(r, "id")),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update report", http.StatusInternalServerError)
		return
	}
	log.InfoContext(ctx, "moderation_report_updated",
		slog.String("component", component),
		slog.String("report_id", pgutil.UUIDToString(row.ID)),
		slog.String("status", row.Status),
		slog.String("updated_by_user_id", user.ID),
	)
	writeJSON(w, http.StatusOK, toResponse(row))
}

func (h *Handler) deliverDiscord(ctx context.Context, log *slog.Logger, row db.ModerationReport) string {
	reportID := pgutil.UUIDToString(row.ID)
	if h.discord == nil || h.discordChannelID == "" {
		reason := "discord moderation report integration is not configured"
		if err := h.q.MarkModerationReportDiscordSkipped(ctx, db.MarkModerationReportDiscordSkippedParams{
			ID:           row.ID,
			DiscordError: reason,
		}); err != nil {
			log.WarnContext(ctx, "moderation_report_discord_skip_update_failed",
				slog.String("component", component),
				slog.String("report_id", reportID),
				slog.Any("err", err),
			)
		}
		return "skipped"
	}

	thread, err := h.discord.CreateForumPost(ctx, h.discordChannelID, buildDiscordPost(row))
	if err != nil {
		errorMessage := discord.Truncate(err.Error(), maxDiscordErrorLength)
		if updateErr := h.q.MarkModerationReportDiscordFailed(ctx, db.MarkModerationReportDiscordFailedParams{
			ID:           row.ID,
			DiscordError: errorMessage,
		}); updateErr != nil {
			log.WarnContext(ctx, "moderation_report_discord_failure_update_failed",
				slog.String("component", component),
				slog.String("report_id", reportID),
				slog.Any("err", updateErr),
			)
		}
		log.ErrorContext(ctx, "moderation_report_discord_post_failed",
			slog.String("component", component),
			slog.String("report_id", reportID),
			slog.Any("err", err),
		)
		return "failed"
	}

	if err := h.q.MarkModerationReportDiscordPosted(ctx, db.MarkModerationReportDiscordPostedParams{
		ID:               row.ID,
		DiscordThreadID:  thread.ThreadID,
		DiscordMessageID: thread.MessageID,
	}); err != nil {
		log.WarnContext(ctx, "moderation_report_discord_success_update_failed",
			slog.String("component", component),
			slog.String("report_id", reportID),
			slog.String("discord_thread_id", thread.ThreadID),
			slog.String("discord_message_id", thread.MessageID),
			slog.Any("err", err),
		)
	}
	return "posted"
}

func buildDiscordPost(row db.ModerationReport) discord.Post {
	reportID := pgutil.UUIDToString(row.ID)
	title := fmt.Sprintf("[%s] %s report from %s", row.Status, subjectLabel(row.SubjectType), row.ReporterDisplayName)
	content := fmt.Sprintf(
		"**Status:** %s\n**Reason:** %s\n**Reporter:** %s (`%s`)\n**Target:** %s (`%s`)\n**Report ID:** `%s`\n**Subject:** %s\n**Video ID:** `%s`\n**Review ID:** `%s`\n**Page:** %s\n\n**Reported comment**\n%s\n\n**Reporter details**\n%s",
		row.Status,
		row.Reason,
		row.ReporterDisplayName,
		row.ReporterUserID,
		emptyFallback(row.TargetDisplayName, "unknown"),
		emptyFallback(row.TargetUserID, "unknown"),
		reportID,
		row.SubjectType,
		uuidString(row.TargetVideoID),
		uuidString(row.TargetReviewID),
		emptyFallback(row.PageUrl, "not captured"),
		emptyFallback(row.TargetReviewContent, "No reported comment captured."),
		emptyFallback(row.Details, "No extra details provided."),
	)
	return discord.Post{Title: title, Content: content}
}

func toResponse(row db.ModerationReport) reportResponse {
	resp := reportResponse{
		ID:                  pgutil.UUIDToString(row.ID),
		ReporterUserID:      row.ReporterUserID,
		ReporterDisplayName: row.ReporterDisplayName,
		SubjectType:         row.SubjectType,
		TargetReviewID:      uuidString(row.TargetReviewID),
		TargetVideoID:       uuidString(row.TargetVideoID),
		TargetUserID:        row.TargetUserID,
		TargetDisplayName:   row.TargetDisplayName,
		TargetReviewContent: row.TargetReviewContent,
		Reason:              row.Reason,
		Details:             row.Details,
		PageURL:             row.PageUrl,
		Status:              row.Status,
		ResolvedByUserID:    row.ResolvedByUserID,
		DiscordStatus:       row.DiscordStatus,
		DiscordChannelID:    row.DiscordChannelID,
		DiscordThreadID:     row.DiscordThreadID,
		DiscordMessageID:    row.DiscordMessageID,
		DiscordError:        row.DiscordError,
		CreatedAt:           row.CreatedAt.Time,
		UpdatedAt:           row.UpdatedAt.Time,
	}
	if row.ResolvedAt.Valid {
		resp.ResolvedAt = &row.ResolvedAt.Time
	}
	return resp
}

func validReason(reason string) bool {
	switch reason {
	case "harassment", "spam", "inappropriate_content", "other":
		return true
	default:
		return false
	}
}

func validStatus(status string) bool {
	switch status {
	case "open", "resolved", "rejected":
		return true
	default:
		return false
	}
}

func parseBoundedInt32(raw string, fallback, min, max int32) int32 {
	if strings.TrimSpace(raw) == "" {
		return fallback
	}
	value, err := strconv.ParseInt(raw, 10, 32)
	if err != nil {
		return fallback
	}
	if int32(value) < min {
		return min
	}
	if int32(value) > max {
		return max
	}
	return int32(value)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func uuidString(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return pgutil.UUIDToString(value)
}

func subjectLabel(value string) string {
	if value == "review_comment" {
		return "comment"
	}
	return value
}

func emptyFallback(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
