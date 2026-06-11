//go:build integration

package audit_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/audit"
	"github.com/OZIOisgood/zeta/internal/testdb"
)

func TestIntegration_EnsurePartitions_CreatesRollingWindow(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()

	if err := audit.EnsurePartitions(ctx, pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}

	var n int
	if err := pool.QueryRow(ctx,
		`SELECT count(*) FROM pg_inherits WHERE inhparent = 'audit_events'::regclass`).Scan(&n); err != nil {
		t.Fatalf("scan: %v", err)
	}
	// previous month + current + 3 ahead = 5 partitions.
	if n < 5 {
		t.Errorf("partition count = %d, want >= 5", n)
	}
}

func TestIntegration_DropExpiredPartitions_RemovesOld(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if err := audit.EnsurePartitions(ctx, pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}

	// Manually create a partition 40 months in the past (older than 3y).
	// Partition bounds must be SQL literals — Postgres does not allow bind
	// parameters in DDL — so format them into the statement.
	old := time.Now().AddDate(0, -40, 0)
	start := time.Date(old.Year(), old.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	name := "audit_events_" + start.Format("2006_01")
	stmt := fmt.Sprintf(
		`CREATE TABLE %s PARTITION OF audit_events FOR VALUES FROM ('%s') TO ('%s')`,
		name, start.Format("2006-01-02"), end.Format("2006-01-02"))
	if _, err := pool.Exec(ctx, stmt); err != nil {
		t.Fatalf("create old partition: %v", err)
	}

	if err := audit.DropExpiredPartitions(ctx, pool, audit.DefaultRetentionDays*24*time.Hour); err != nil {
		t.Fatalf("DropExpiredPartitions: %v", err)
	}

	var exists bool
	if err := pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = $1)`, name).Scan(&exists); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if exists {
		t.Errorf("expired partition %s still exists", name)
	}
}
