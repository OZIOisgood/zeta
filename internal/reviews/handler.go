package reviews

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/features"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	q        *db.Queries
	features *features.Handler
	logger   *slog.Logger
}

func NewHandler(q *db.Queries, features *features.Handler, logger *slog.Logger) *Handler {
	return &Handler{
		q:        q,
		features: features,
		logger:   logger,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/{id}/reviews", h.ListReviews)
	r.Post("/{id}/reviews", h.CreateReview)
}

type ReviewResponse struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateReviewRequest struct {
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

	feats, err := h.features.GetFeatures(userInfo.ID)
	if err != nil {
		log.ErrorContext(ctx, "list_reviews_features_check_failed",
			slog.String("component", "reviews"),
			slog.String("user_id", userInfo.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}

	canRead := false
	for _, f := range feats {
		if f == "reviews--read" {
			canRead = true
			break
		}
	}

	if !canRead {
		http.Error(w, "Permission denied: requires reviews--read", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var videoID pgtype.UUID
	if err := videoID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
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
	for i, review := range reviews {
		var createdAt time.Time
		if review.CreatedAt.Valid {
			createdAt = review.CreatedAt.Time
		}

		response[i] = ReviewResponse{
			ID:        toUUIDString(review.ID),
			Content:   review.Content,
			CreatedAt: createdAt,
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

	feats, err := h.features.GetFeatures(userInfo.ID)
	if err != nil {
		log.ErrorContext(ctx, "create_review_features_check_failed",
			slog.String("component", "reviews"),
			slog.String("user_id", userInfo.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}

	canAdd := false
	for _, f := range feats {
		if f == "reviews--create" {
			canAdd = true
			break
		}
	}

	if !canAdd {
		http.Error(w, "Permission denied: requires reviews--create", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var videoID pgtype.UUID
	if err := videoID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
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

	review, err := h.q.CreateVideoReview(ctx, db.CreateVideoReviewParams{
		VideoID: videoID,
		Content: req.Content,
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

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         toUUIDString(review.ID),
		"content":    review.Content,
		"created_at": createdAt,
	})
}

func toUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}
