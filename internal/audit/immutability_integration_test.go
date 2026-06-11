//go:build integration

package audit_test

import (
	"context"
	"strings"
	"testing"

	"github.com/OZIOisgood/zeta/internal/audit"
	"github.com/OZIOisgood/zeta/internal/testdb"
)

func TestIntegration_AuditEvents_AreImmutable(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if err := audit.EnsurePartitions(ctx, pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}

	rec := audit.NewRecorder()
	tx, _ := pool.Begin(userCtx(ctx))
	if err := rec.Record(userCtx(ctx), tx, audit.Event{
		Action:       audit.ActionGroupUpdated,
		ResourceType: audit.ResourceGroup,
		ResourceID:   "44444444-4444-4444-4444-444444444444",
	}); err != nil {
		t.Fatalf("Record: %v", err)
	}
	_ = tx.Commit(userCtx(ctx))

	// UPDATE must be rejected by the trigger.
	_, err := pool.Exec(ctx, "UPDATE audit_events SET action = 'tampered'")
	if err == nil || !strings.Contains(err.Error(), "append-only") {
		t.Errorf("UPDATE error = %v, want append-only rejection", err)
	}

	// DELETE must be rejected by the trigger.
	_, err = pool.Exec(ctx, "DELETE FROM audit_events")
	if err == nil || !strings.Contains(err.Error(), "append-only") {
		t.Errorf("DELETE error = %v, want append-only rejection", err)
	}
}
