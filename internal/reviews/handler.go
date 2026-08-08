package reviews

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/llm"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/notifications"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/go-chi/chi/v5"
	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	q          db.Querier
	logger     *slog.Logger
	llmService llm.Enhancer
}

func NewHandler(q db.Querier, logger *slog.Logger, llmService llm.Enhancer) *Handler {
	return &Handler{
		q:          q,
		logger:     logger,
		llmService: llmService,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/{id}/reviews", h.ListReviews)
	r.Post("/{id}/reviews", h.CreateReview)
	r.Put("/{id}/reviews/{reviewId}", h.UpdateReview)
	r.Delete("/{id}/reviews/{reviewId}", h.DeleteReview)
}

type ReviewAuthor struct {
	ID     string `json:"id,omitempty"`
	Name   string `json:"name"`
	Avatar string `json:"avatar,omitempty"`
}

type ReviewResponse struct {
	ID               string        `json:"id"`
	Content          string        `json:"content"`
	TimestampSeconds *int32        `json:"timestamp_seconds,omitempty"`
	ParentID         *string       `json:"parent_id,omitempty"`
	Author           *ReviewAuthor `json:"author,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
}

type CreateReviewRequest struct {
	Content          string  `json:"content"`
	TimestampSeconds *int32  `json:"timestamp_seconds,omitempty"`
	ParentID         *string `json:"parent_id,omitempty"`
}

type UpdateReviewRequest struct {
	Content string `json:"content"`
}

func (h *Handler) ListReviews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Permissions, permissions.ReviewsRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var videoID pgtype.UUID
	if err := videoID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	if !h.ensureVideoVisible(w, r, log, userInfo, videoID, idStr) {
		return
	}

	reviews, err := h.q.ListVideoReviews(ctx, videoID)
	if err != nil {
		log.ErrorContext(ctx, "list_reviews_failed",
			slog.String("component", "reviews"),
			slog.String("video_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list reviews", http.StatusInternalServerError)
		return
	}

	response := make([]ReviewResponse, len(reviews))
	for i, row := range reviews {
		var createdAt time.Time
		if row.CreatedAt.Valid {
			createdAt = row.CreatedAt.Time
		}

		var tsSeconds *int32
		if row.TimestampSeconds.Valid {
			tsSeconds = &row.TimestampSeconds.Int32
		}

		var parentID *string
		if row.ParentID.Valid {
			s := pgutil.UUIDToString(row.ParentID)
			parentID = &s
		}

		var author *ReviewAuthor
		if row.AuthorFirstName.Valid || row.AuthorLastName.Valid {
			name := strings.TrimSpace(row.AuthorFirstName.String + " " + row.AuthorLastName.String)
			if name != "" {
				author = &ReviewAuthor{Name: name}
				if row.AuthorID.Valid {
					author.ID = row.AuthorID.String
				}
				if row.AuthorAvatar.Valid && row.AuthorAvatar.String != "" {
					author.Avatar = row.AuthorAvatar.String
				}
			}
		}
		if row.AuthorID.Valid && author == nil {
			log.ErrorContext(ctx, "review_author_preferences_missing",
				slog.String("component", "reviews"),
				slog.String("review_id", pgutil.UUIDToString(row.ID)),
				slog.String("author_id", row.AuthorID.String),
			)
			http.Error(w, "Review author profile is missing", http.StatusInternalServerError)
			return
		}
		response[i] = ReviewResponse{
			ID:               pgutil.UUIDToString(row.ID),
			Content:          row.Content,
			TimestampSeconds: tsSeconds,
			ParentID:         parentID,
			Author:           author,
			CreatedAt:        createdAt,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateReview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Permissions, permissions.ReviewsCreate) &&
		!permissions.HasPermission(userInfo.Permissions, permissions.ReviewsReply) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var videoID pgtype.UUID
	if err := videoID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	if !h.ensureVideoVisible(w, r, log, userInfo, videoID, idStr) {
		return
	}

	var req CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	// Resolve parent_id: validate, enforce single-level, strip timestamp for replies.
	var parentID pgtype.UUID
	isReply := false
	if req.ParentID != nil {
		isReply = true
		var rawParentID pgtype.UUID
		if err := rawParentID.Scan(*req.ParentID); err != nil {
			http.Error(w, "Invalid parent_id", http.StatusBadRequest)
			return
		}
		parent, err := h.q.GetVideoReview(ctx, rawParentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				log.WarnContext(ctx, "reply_parent_not_found",
					slog.String("component", "reviews"),
					slog.String("parent_id", *req.ParentID),
				)
				http.Error(w, "Parent review not found", http.StatusBadRequest)
				return
			}
			log.ErrorContext(ctx, "get_parent_review_failed",
				slog.String("component", "reviews"),
				slog.String("video_id", idStr),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to validate parent review", http.StatusInternalServerError)
			return
		}
		if parent.VideoID != videoID {
			log.WarnContext(ctx, "reply_cross_video_rejected",
				slog.String("component", "reviews"),
				slog.String("video_id", idStr),
				slog.String("parent_id", *req.ParentID),
			)
			http.Error(w, "Parent review belongs to a different video", http.StatusBadRequest)
			return
		}
		// Re-root to top level: if the parent is itself a reply, use its parent.
		if parent.ParentID.Valid {
			parentID = parent.ParentID
		} else {
			parentID = rawParentID
		}
		// Replies never carry a video timestamp.
		req.TimestampSeconds = nil
	}

	assetStatus, err := h.q.GetAssetStatusByVideoID(ctx, videoID)
	if err != nil {
		log.ErrorContext(ctx, "get_asset_status_failed",
			slog.String("component", "reviews"),
			slog.String("video_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check video status", http.StatusInternalServerError)
		return
	}

	if !canCreateReviewForAssetState(userInfo, assetStatus, isReply) {
		if isReply {
			http.Error(w, "Cannot reply before the video is ready", http.StatusForbidden)
			return
		}
		http.Error(w, "Cannot add reviews to a completed video", http.StatusForbidden)
		return
	}

	authorPrefs, err := h.q.GetUserPreferences(ctx, userInfo.ID)
	if err != nil {
		log.ErrorContext(ctx, "review_author_preferences_fetch_failed",
			slog.String("component", "reviews"),
			slog.String("user_id", userInfo.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Review author profile is missing", http.StatusInternalServerError)
		return
	}
	authorName := strings.TrimSpace(authorPrefs.FirstName + " " + authorPrefs.LastName)
	if authorName == "" {
		log.ErrorContext(ctx, "review_author_name_missing",
			slog.String("component", "reviews"),
			slog.String("user_id", userInfo.ID),
		)
		http.Error(w, "Review author profile is incomplete", http.StatusInternalServerError)
		return
	}

	authorID := pgtype.Text{String: userInfo.ID, Valid: userInfo.ID != ""}

	var timestampSeconds pgtype.Int4
	if req.TimestampSeconds != nil {
		timestampSeconds = pgtype.Int4{Int32: *req.TimestampSeconds, Valid: true}
	}

	review, err := h.q.CreateVideoReview(ctx, db.CreateVideoReviewParams{
		VideoID:          videoID,
		Content:          req.Content,
		TimestampSeconds: timestampSeconds,
		ParentID:         parentID,
		AuthorID:         authorID,
	})
	if err != nil {
		log.ErrorContext(ctx, "create_review_failed",
			slog.String("component", "reviews"),
			slog.String("video_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create review", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	var createdAt time.Time
	if review.CreatedAt.Valid {
		createdAt = review.CreatedAt.Time
	}

	responseData := map[string]interface{}{
		"id":         pgutil.UUIDToString(review.ID),
		"content":    review.Content,
		"created_at": createdAt,
	}
	if review.TimestampSeconds.Valid {
		responseData["timestamp_seconds"] = review.TimestampSeconds.Int32
	}
	if review.ParentID.Valid {
		responseData["parent_id"] = pgutil.UUIDToString(review.ParentID)
	}
	if authorName != "" {
		author := map[string]interface{}{"id": userInfo.ID, "name": authorName}
		if authorPrefs.Avatar != "" {
			author["avatar"] = authorPrefs.Avatar
		}
		responseData["author"] = author
	}

	json.NewEncoder(w).Encode(responseData)

	// Notify the video owner (student) that their video received a review.
	// Skipped when the author is the owner. Runs detached from the request.
	go func(vID pgtype.UUID, authorID, reviewerName string) {
		bgCtx := context.Background()
		asset, err := h.q.GetAssetOwnerByVideoID(bgCtx, vID)
		if err != nil {
			h.logger.ErrorContext(bgCtx, "video_reviewed_notification_asset_fetch_failed",
				slog.String("component", "reviews"),
				slog.Any("err", err),
			)
			return
		}
		if asset.OwnerID == "" || asset.OwnerID == authorID {
			return
		}
		notifications.Record(bgCtx, h.q, h.logger, asset.OwnerID, notifications.TypeVideoReviewed,
			notifications.VideoReviewedPayload{
				AssetID:      pgutil.UUIDToString(asset.AssetID),
				VideoTitle:   asset.Name,
				GroupName:    asset.GroupName,
				ReviewerName: reviewerName,
			})
	}(videoID, userInfo.ID, authorName)
}

func canCreateReviewForAssetState(user *auth.UserContext, assetStatus db.AssetStatus, isReply bool) bool {
	if isReply {
		if !permissions.HasPermission(user.Permissions, permissions.ReviewsReply) {
			return false
		}
		return assetStatus == db.AssetStatusCompleted ||
			permissions.HasPermission(user.Permissions, permissions.ReviewsReplyBeforeReady)
	}
	return assetStatus != db.AssetStatusCompleted &&
		permissions.HasPermission(user.Permissions, permissions.ReviewsCreate)
}

func (h *Handler) UpdateReview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Permissions, permissions.ReviewsEdit) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var videoID pgtype.UUID
	if err := videoID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	if !h.ensureVideoVisible(w, r, log, userInfo, videoID, idStr) {
		return
	}

	// Check if asset is completed
	assetStatus, err := h.q.GetAssetStatusByVideoID(ctx, videoID)
	if err != nil {
		log.ErrorContext(ctx, "get_asset_status_failed",
			slog.String("component", "reviews"),
			slog.String("video_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check video status", http.StatusInternalServerError)
		return
	}

	if assetStatus == db.AssetStatusCompleted {
		http.Error(w, "Cannot edit reviews on a completed video", http.StatusForbidden)
		return
	}

	reviewIdStr := chi.URLParam(r, "reviewId")
	var reviewID pgtype.UUID
	if err := reviewID.Scan(reviewIdStr); err != nil {
		http.Error(w, "Invalid review ID", http.StatusBadRequest)
		return
	}

	var req UpdateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	existing, err := h.q.GetVideoReview(ctx, reviewID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Review not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "get_review_for_update_failed",
			slog.String("component", "reviews"),
			slog.String("review_id", reviewIdStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to fetch review", http.StatusInternalServerError)
		return
	}
	if existing.AuthorID.Valid && existing.AuthorID.String != userInfo.ID {
		http.Error(w, "Cannot edit another user's review", http.StatusForbidden)
		return
	}

	review, err := h.q.UpdateVideoReview(ctx, db.UpdateVideoReviewParams{
		ID:      reviewID,
		Content: req.Content,
		VideoID: videoID,
	})
	if err != nil {
		log.ErrorContext(ctx, "update_review_failed",
			slog.String("component", "reviews"),
			slog.String("review_id", reviewIdStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update review", http.StatusInternalServerError)
		return
	}

	createdAt := review.CreatedAt.Time
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         pgutil.UUIDToString(review.ID),
		"content":    review.Content,
		"created_at": createdAt,
	})
}

func (h *Handler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Permissions, permissions.ReviewsDelete) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var videoID pgtype.UUID
	if err := videoID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	if !h.ensureVideoVisible(w, r, log, userInfo, videoID, idStr) {
		return
	}

	// Check if asset is completed
	assetStatus, err := h.q.GetAssetStatusByVideoID(ctx, videoID)
	if err != nil {
		log.ErrorContext(ctx, "get_asset_status_failed",
			slog.String("component", "reviews"),
			slog.String("video_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check video status", http.StatusInternalServerError)
		return
	}

	if assetStatus == db.AssetStatusCompleted {
		http.Error(w, "Cannot delete reviews from a completed video", http.StatusForbidden)
		return
	}

	reviewIdStr := chi.URLParam(r, "reviewId")
	var reviewID pgtype.UUID
	if err := reviewID.Scan(reviewIdStr); err != nil {
		http.Error(w, "Invalid review ID", http.StatusBadRequest)
		return
	}

	existing, err := h.q.GetVideoReview(ctx, reviewID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Review not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "get_review_for_delete_failed",
			slog.String("component", "reviews"),
			slog.String("review_id", reviewIdStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to fetch review", http.StatusInternalServerError)
		return
	}
	if existing.AuthorID.Valid && existing.AuthorID.String != userInfo.ID {
		http.Error(w, "Cannot delete another user's review", http.StatusForbidden)
		return
	}

	err = h.q.DeleteVideoReview(ctx, db.DeleteVideoReviewParams{
		ID:      reviewID,
		VideoID: videoID,
	})
	if err != nil {
		log.ErrorContext(ctx, "delete_review_failed",
			slog.String("component", "reviews"),
			slog.String("review_id", reviewIdStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to delete review", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ensureVideoVisible(w http.ResponseWriter, r *http.Request, log *slog.Logger, user *auth.UserContext, videoID pgtype.UUID, videoIDStr string) bool {
	ctx := r.Context()
	visible, err := h.q.CheckVideoVisibleToUser(ctx, db.CheckVideoVisibleToUserParams{
		VideoID:   videoID,
		UserID:    user.ID,
		IsStudent: user.Role == permissions.RoleStudent,
	})
	if err != nil {
		log.ErrorContext(ctx, "video_visibility_check_failed",
			slog.String("component", "reviews"),
			slog.String("video_id", videoIDStr),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check video access", http.StatusInternalServerError)
		return false
	}
	if !visible {
		log.WarnContext(ctx, "video_visibility_denied",
			slog.String("component", "reviews"),
			slog.String("video_id", videoIDStr),
			slog.String("user_id", user.ID),
			slog.String("role", user.Role),
		)
		http.Error(w, "Video not found", http.StatusNotFound)
		return false
	}
	return true
}

type EnhanceTextRequest struct {
	Text string `json:"text"`
}

type EnhanceTextResponse struct {
	EnhancedText string `json:"enhanced_text"`
}

func (h *Handler) EnhanceText(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Permissions, permissions.ReviewsEdit) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req EnhanceTextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Text == "" {
		http.Error(w, "Text is required", http.StatusBadRequest)
		return
	}

	enhancedText, err := h.llmService.EnhanceReviewText(ctx, req.Text)
	if err != nil {
		log.ErrorContext(ctx, "enhance_text_failed",
			slog.String("component", "reviews"),
			slog.Int("text_length", len(req.Text)),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to enhance text", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "text_enhanced_successfully",
		slog.String("component", "reviews"),
		slog.Int("original_length", len(req.Text)),
		slog.Int("enhanced_length", len(enhancedText)),
	)

	response := EnhanceTextResponse{
		EnhancedText: enhancedText,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
