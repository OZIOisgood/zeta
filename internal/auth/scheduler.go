package auth

import (
	"crypto/subtle"
	"log/slog"
	"net/http"
)

// RequireSchedulerSecret protects internal scheduler endpoints with a
// constant-time Bearer-secret check. This is the single canonical
// implementation — do not hand-roll the check in handlers.
//
// An empty secret locks the endpoints; that misconfiguration is logged once at
// construction so it is visible at startup instead of surfacing months later
// as silent 401s on the maintenance cron.
func RequireSchedulerSecret(secret string, logger *slog.Logger) func(http.Handler) http.Handler {
	if secret == "" {
		logger.Error("scheduler_secret_missing",
			slog.String("component", "auth"),
		)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if secret == "" || subtle.ConstantTimeCompare([]byte(header), []byte("Bearer "+secret)) != 1 {
				logger.WarnContext(r.Context(), "scheduler_auth_rejected",
					slog.String("component", "auth"),
					slog.String("path", r.URL.Path),
				)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
