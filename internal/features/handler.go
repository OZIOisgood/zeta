package features

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))
	return &Handler{
		logger: logger,
	}
}

// GetFeatures fetches feature flags for a given user from WorkOS
func (h *Handler) GetFeatures(userID string) ([]string, error) {
	// 1. Fetch feature flags directly from WorkOS API
	features, err := h.fetchFromAPI(userID)
	if err != nil {
		// Log error but continue with fallback
		h.logger.DebugContext(context.Background(), "features_api_fetch_failed",
			slog.String("component", "features"),
			slog.String("user_id", userID),
			slog.Any("err", err),
		)
		// If API fails, try metadata fallback
		metaFeatures, fallbackErr := h.fetchFromMetadata(userID)
		if fallbackErr == nil && len(metaFeatures) > 0 {
			return metaFeatures, nil
		}
		// Return original API error if both fail
		return nil, err
	}

	// 2. Fallback to metadata if empty (backward compatibility)
	if len(features) == 0 {
		metaFeatures, err := h.fetchFromMetadata(userID)
		if err == nil {
			features = append(features, metaFeatures...)
		}
	}

	return features, nil
}

func (h *Handler) fetchFromAPI(userID string) ([]string, error) {
	apiKey := os.Getenv("WORKOS_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("WORKOS_API_KEY is not set")
	}

	url := fmt.Sprintf("https://api.workos.com/user_management/users/%s/feature-flags", userID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feature flags: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WorkOS API returned status: %d", resp.StatusCode)
	}

	// Parse response
	var result struct {
		Data []struct {
			Name string `json:"name"`
			Key  string `json:"key"`
			Slug string `json:"slug"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	var features []string
	for _, f := range result.Data {
		// Prefer slug, then key, fallback to name (lowercase)
		if f.Slug != "" {
			features = append(features, f.Slug)
		} else if f.Key != "" {
			features = append(features, f.Key)
		} else if f.Name != "" {
			features = append(features, strings.ToLower(f.Name))
		}
	}
	return features, nil
}

func (h *Handler) fetchFromMetadata(userID string) ([]string, error) {
	user, err := usermanagement.GetUser(context.Background(), usermanagement.GetUserOpts{
		User: userID,
	})
	if err != nil {
		return nil, err
	}

	var features []string
	if strVal, ok := user.Metadata["features"]; ok {
		parts := strings.Split(strVal, ",")
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				features = append(features, trimmed)
			}
		}
	}
	return features, nil
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	// Get current user from context (set by auth middleware)
	userCtx := auth.GetUser(ctx)
	if userCtx == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	features, err := h.GetFeatures(userCtx.ID)
	if err != nil {
		log.ErrorContext(ctx, "features_list_failed",
			slog.String("component", "features"),
			slog.String("user_id", userCtx.ID),
			slog.Any("err", err),
		)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Ensure we return an empty array [] if nil
	if features == nil {
		features = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(features)
}

func (h *Handler) HasFeature(userID, feature string) bool {
	features, err := h.GetFeatures(userID)
	if err != nil {
		h.logger.DebugContext(context.Background(), "features_check_failed",
			slog.String("component", "features"),
			slog.String("user_id", userID),
			slog.String("feature", feature),
			slog.Any("err", err),
		)
		return false
	}
	for _, f := range features {
		if f == feature {
			return true
		}
	}
	return false
}
