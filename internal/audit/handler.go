package audit

import (
	"crypto/subtle"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DefaultRetentionDays is the fallback retention when AUDIT_RETENTION_DAYS is unset.
const DefaultRetentionDays = 1095 // 3 years

// Handler exposes the scheduler-triggered maintenance endpoint.
type Handler struct {
	pool            *pgxpool.Pool
	logger          *slog.Logger
	schedulerSecret string
	retention       time.Duration
}

// NewHandler constructs the audit maintenance handler. retention <= 0 falls
// back to DefaultRetentionDays.
func NewHandler(pool *pgxpool.Pool, logger *slog.Logger, schedulerSecret string, retention time.Duration) *Handler {
	if retention <= 0 {
		retention = time.Duration(DefaultRetentionDays) * 24 * time.Hour
	}
	return &Handler{pool: pool, logger: logger, schedulerSecret: schedulerSecret, retention: retention}
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
