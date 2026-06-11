package audit

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// monthsAhead is how many future monthly partitions EnsurePartitions keeps ready.
const monthsAhead = 3

// EnsurePartitions creates the monthly partitions for the previous month through
// monthsAhead future months. Idempotent: existing partitions are left untouched.
func EnsurePartitions(ctx context.Context, pool *pgxpool.Pool) error {
	now := time.Now().UTC()
	base := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	for i := -1; i <= monthsAhead; i++ {
		start := base.AddDate(0, i, 0)
		end := start.AddDate(0, 1, 0)
		name := partitionName(start)
		stmt := fmt.Sprintf(
			`CREATE TABLE IF NOT EXISTS %s PARTITION OF audit_events FOR VALUES FROM ('%s') TO ('%s')`,
			name, start.Format("2006-01-02"), end.Format("2006-01-02"),
		)
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("create partition %s: %w", name, err)
		}
	}
	return nil
}

// DropExpiredPartitions drops partitions whose entire range is older than
// retention. Uses DROP TABLE (DDL), which the append-only trigger does not block.
func DropExpiredPartitions(ctx context.Context, pool *pgxpool.Pool, retention time.Duration) error {
	cutoff := time.Now().UTC().Add(-retention)
	rows, err := pool.Query(ctx,
		`SELECT inhrelid::regclass::text FROM pg_inherits WHERE inhparent = 'audit_events'::regclass`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		names = append(names, name)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, name := range names {
		end, ok := partitionUpperBound(name)
		if !ok {
			continue // not a managed monthly partition; skip
		}
		if !end.After(cutoff) {
			if _, err := pool.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s`, name)); err != nil {
				return fmt.Errorf("drop partition %s: %w", name, err)
			}
		}
	}
	return nil
}

func partitionName(monthStart time.Time) string {
	return "audit_events_" + monthStart.Format("2006_01")
}

// partitionUpperBound parses the exclusive upper bound from a managed partition
// name like "audit_events_2026_06" -> 2026-07-01.
func partitionUpperBound(name string) (time.Time, bool) {
	const prefix = "audit_events_"
	if len(name) <= len(prefix) || name[:len(prefix)] != prefix {
		return time.Time{}, false
	}
	start, err := time.Parse("2006_01", name[len(prefix):])
	if err != nil {
		return time.Time{}, false
	}
	return start.AddDate(0, 1, 0), true
}
