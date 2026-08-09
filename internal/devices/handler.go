package devices

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Handler manages push device token registration for authenticated users.
// Every operation is scoped to the caller's user ID so a user can only
// register or unregister their own devices.
type Handler struct {
	q      db.Querier
	logger *slog.Logger
}

func NewHandler(q db.Querier, log *slog.Logger) *Handler {
	return &Handler{q: q, logger: log}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/devices", h.Register)
	r.Delete("/devices/{token}", h.Unregister)
}

type registerRequest struct {
	ExpoPushToken string `json:"expo_push_token"`
	Platform      string `json:"platform"`
}

// isValidExpoToken returns true when the token has the well-known Expo prefix.
// See https://docs.expo.dev/push-notifications/sending-notifications/
func isValidExpoToken(token string) bool {
	return strings.HasPrefix(token, "ExponentPushToken[") || strings.HasPrefix(token, "ExpoPushToken[")
}

// tokenPrefix returns the first 32 characters of a token for safe logging —
// enough to correlate logs without exposing the full credential.
func tokenPrefix(token string) string {
	if len(token) <= 32 {
		return token
	}
	return token[:32] + "..."
}

// Register handles POST /devices.
// Body: { "expo_push_token": string, "platform": string (optional) }
// Upserts the token for the authenticated user. Responds 200 {"status":"ok"}.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.WarnContext(ctx, "device_register_bad_body",
			slog.String("component", "devices"),
			slog.String("user_id", user.ID),
		)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ExpoPushToken == "" || !isValidExpoToken(req.ExpoPushToken) {
		log.WarnContext(ctx, "device_register_invalid_token",
			slog.String("component", "devices"),
			slog.String("user_id", user.ID),
			slog.String("token_prefix", tokenPrefix(req.ExpoPushToken)),
		)
		http.Error(w, "Invalid expo_push_token", http.StatusBadRequest)
		return
	}

	platform := pgtype.Text{}
	if req.Platform == "ios" || req.Platform == "android" {
		platform = pgtype.Text{String: req.Platform, Valid: true}
	}

	if _, err := h.q.UpsertDevice(ctx, db.UpsertDeviceParams{
		UserID:        user.ID,
		ExpoPushToken: req.ExpoPushToken,
		Platform:      platform,
	}); err != nil {
		log.ErrorContext(ctx, "device_register_failed",
			slog.String("component", "devices"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to register device", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "device_registered",
		slog.String("component", "devices"),
		slog.String("user_id", user.ID),
		slog.String("token_prefix", tokenPrefix(req.ExpoPushToken)),
		slog.String("platform", req.Platform),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// Unregister handles DELETE /devices/{token}.
// Removes the device scoped to the caller's user ID. Responds 204 No Content.
func (h *Handler) Unregister(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	token := chi.URLParam(r, "token")
	if token == "" {
		http.Error(w, "Missing token", http.StatusBadRequest)
		return
	}

	if err := h.q.DeleteDevice(ctx, db.DeleteDeviceParams{
		ExpoPushToken: token,
		UserID:        user.ID,
	}); err != nil {
		log.ErrorContext(ctx, "device_unregister_failed",
			slog.String("component", "devices"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to unregister device", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "device_unregistered",
		slog.String("component", "devices"),
		slog.String("user_id", user.ID),
		slog.String("token_prefix", tokenPrefix(token)),
	)

	w.WriteHeader(http.StatusNoContent)
}
