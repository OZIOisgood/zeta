package features

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct{}

func NewHandler() *Handler {
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))
	return &Handler{}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	// Get current user from context (set by auth middleware)
	userCtx := auth.GetUser(r.Context())
	if userCtx == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Fetch feature flags directly from WorkOS API
	apiKey := os.Getenv("WORKOS_API_KEY")
	if apiKey == "" {
		http.Error(w, "WORKOS_API_KEY is not set", http.StatusInternalServerError)
		return
	}

	url := fmt.Sprintf("https://api.workos.com/user_management/users/%s/feature-flags", userCtx.ID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch feature flags: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("WorkOS API returned status: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	// Parse response
	var result struct {
		Data []struct {
			Name string `json:"name"`
			Key  string `json:"key"` // Usually it is 'key' or 'slug'
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		http.Error(w, "Failed to decode response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var features []string
	for _, f := range result.Data {
		// Prefer key/slug, fallback to name (lowercase)
		if f.Key != "" {
			features = append(features, f.Key)
		} else if f.Name != "" {
			features = append(features, strings.ToLower(f.Name))
		}
	}

	// Fallback to metadata if empty (backward compatibility)
	if len(features) == 0 {
		h.listFromMetadata(w, userCtx.ID, &features)
	}

	// Ensure we return an empty array [] if nil
	if features == nil {
		features = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(features)
}

func (h *Handler) listFromMetadata(w http.ResponseWriter, userID string, features *[]string) {
	user, err := usermanagement.GetUser(context.Background(), usermanagement.GetUserOpts{
		User: userID,
	})
	if err != nil {
		return
	}

	if strVal, ok := user.Metadata["features"]; ok {
		parts := strings.Split(strVal, ",")
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				*features = append(*features, trimmed)
			}
		}
	}
}
