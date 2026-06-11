package audit

import (
	"crypto/subtle"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DefaultRetentionDays is the fallback retention when AUDIT_RETENTION_DAYS is unset.
const DefaultRetentionDays = 1095 // 3 years

// retentionFromEnv resolves the retention window from AUDIT_RETENTION_DAYS,
// falling back to DefaultRetentionDays for empty/invalid/non-positive values.
func retentionFromEnv() time.Duration {
	days := DefaultRetentionDays
	if v := os.Getenv("AUDIT_RETENTION_DAYS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			days = n
		}
	}
	return time.Duration(days) * 24 * time.Hour
}

// Handler exposes the scheduler-triggered maintenance endpoint.
type Handler struct {
	pool            *pgxpool.Pool
	logger          *slog.Logger
	schedulerSecret string
	retention       time.Duration
}

// NewHandler constructs the audit maintenance handler.
func NewHandler(pool *pgxpool.Pool, logger *slog.Logger, schedulerSecret string) *Handler {
	return &Handler{
		pool:            pool,
		logger:          logger,
		schedulerSecret: schedulerSecret,
		retention:       retentionFromEnv(),
	}
}

// RunMaintenance ensures upcoming partitions exist and drops expired ones.
// Protected by the scheduler secret; intended to be called daily by cron.
func (h *Handler) RunMaintenance(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	secret := r.Header.Get("Authorization")
	if h.schedulerSecret == "" || subtle.ConstantTimeCompare([]byte(secret), []byte("Bearer "+h.schedulerSecret)) != 1 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := EnsurePartitions(ctx, h.pool); err != nil {
		log.ErrorContext(ctx, "audit_ensure_partitions_failed", slog.String("component", "audit"), slog.Any("err", err))
		http.Error(w, "maintenance failed", http.StatusInternalServerError)
		return
	}
	if err := DropExpiredPartitions(ctx, h.pool, h.retention); err != nil {
		log.ErrorContext(ctx, "audit_drop_expired_failed", slog.String("component", "audit"), slog.Any("err", err))
		http.Error(w, "maintenance failed", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "audit_maintenance_ran", slog.String("component", "audit"))
	w.WriteHeader(http.StatusOK)
}
