//go:build integration

package audit_test

import (
	"context"
	"testing"

	"github.com/OZIOisgood/zeta/internal/audit"
	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/testdb"
)

func userCtx(ctx context.Context) context.Context {
	ctx = context.WithValue(ctx, auth.UserKey, &auth.UserContext{
		ID:        "user_123",
		Email:     "coach@test.com",
		FirstName: "Cora",
		LastName:  "Coach",
		Role:      permissions.RoleExpert,
	})
	return audit.WithRequestMeta(ctx, audit.RequestMeta{RequestID: "req-1", IP: "10.0.0.1", UserAgent: "test-agent"})
}

func TestIntegration_Recorder_WritesUserEvent(t *testing.T) {
	pool := testdb.New(t)
	if err := audit.EnsurePartitions(context.Background(), pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}
	rec := audit.NewRecorder()

	ctx := userCtx(context.Background())
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if err := rec.Record(ctx, tx, audit.Event{
		Action:       audit.ActionGroupCreated,
		ResourceType: audit.ResourceGroup,
		ResourceID:   "11111111-1111-1111-1111-111111111111",
		GroupID:      "11111111-1111-1111-1111-111111111111",
		NewValues:    map[string]any{"name": "Team A"},
	}); err != nil {
		t.Fatalf("Record: %v", err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatalf("commit: %v", err)
	}

	var actorID, actorType, actorLabel, action string
	row := pool.QueryRow(ctx,
		`SELECT actor_id, actor_type, actor_label, action FROM audit_events WHERE action = $1`,
		audit.ActionGroupCreated)
	if err := row.Scan(&actorID, &actorType, &actorLabel, &action); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if actorID != "user_123" || actorType != "user" || actorLabel != "Cora Coach" {
		t.Errorf("actor = (%q,%q,%q), want (user_123,user,Cora Coach)", actorID, actorType, actorLabel)
	}
}

func TestIntegration_Recorder_SystemActorWhenNoUser(t *testing.T) {
	pool := testdb.New(t)
	if err := audit.EnsurePartitions(context.Background(), pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}
	rec := audit.NewRecorder()

	ctx := context.Background()
	tx, _ := pool.Begin(ctx)
	if err := rec.Record(ctx, tx, audit.Event{
		Action:       audit.ActionRecordingCreated,
		ResourceType: audit.ResourceRecording,
		ResourceID:   "22222222-2222-2222-2222-222222222222",
	}); err != nil {
		t.Fatalf("Record: %v", err)
	}
	_ = tx.Commit(ctx)

	var actorType string
	var actorID *string
	var metadata []byte
	row := pool.QueryRow(ctx,
		`SELECT actor_type, actor_id, metadata FROM audit_events WHERE action = $1`,
		audit.ActionRecordingCreated)
	if err := row.Scan(&actorType, &actorID, &metadata); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if actorType != "system" || actorID != nil {
		t.Errorf("actor_type=%q actor_id=%v, want system/NULL", actorType, actorID)
	}
	if metadata != nil {
		t.Errorf("metadata = %s, want SQL NULL for empty request context", metadata)
	}
}

func TestIntegration_Recorder_RollbackLeavesNoEvent(t *testing.T) {
	pool := testdb.New(t)
	if err := audit.EnsurePartitions(context.Background(), pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}
	rec := audit.NewRecorder()

	ctx := userCtx(context.Background())
	tx, _ := pool.Begin(ctx)
	if err := rec.Record(ctx, tx, audit.Event{
		Action:       audit.ActionGroupDeleted,
		ResourceType: audit.ResourceGroup,
		ResourceID:   "33333333-3333-3333-3333-333333333333",
	}); err != nil {
		t.Fatalf("Record: %v", err)
	}
	_ = tx.Rollback(ctx)

	var count int
	if err := pool.QueryRow(ctx,
		`SELECT count(*) FROM audit_events WHERE action = $1`,
		audit.ActionGroupDeleted).Scan(&count); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if count != 0 {
		t.Errorf("count = %d, want 0 (rolled back)", count)
	}
}
