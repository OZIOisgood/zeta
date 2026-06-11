# Audit-Trail Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable, self-contained foundation of an append-only audit trail — the `audit_events` table, the `internal/audit` package (Recorder + event taxonomy + context middleware), DB-enforced immutability, and partition-based 3-year retention — with no domain handlers wired yet.

**Architecture:** Application-level audit writes that share the caller's `pgx.Tx` (atomic with the mutation). A monthly RANGE-partitioned `audit_events` table; a `BEFORE UPDATE OR DELETE` trigger makes rows immutable; retention drops expired partitions (DDL, so the trigger never blocks it). Actor and request metadata come from `context.Context`.

**Tech Stack:** Go, chi, pgx/v5 + pgxpool, sqlc v1.30, golang-migrate, PostgreSQL 16, testcontainers-go.

**Scope note:** This plan delivers the audit engine and proves it works *in isolation*. Wiring each domain (groups, coaching, reviews, assets, users, invitations) into the Recorder is intentionally **out of scope** here and will be covered by separate per-domain rollout plans (see "Rollout Roadmap" at the end).

**Conventions:**
- Commands below assume a **Windows host driving WSL**, hence the
  `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && <cmd>"` wrapper. **If you
  run the session inside WSL** (e.g. VS Code Remote-SSH into WSL), drop the wrapper
  and run the inner `<cmd>` directly (`make api:build`, `go test …`).
- Integration tests use the `integration` build tag and require Docker (testcontainers).
- Stage files explicitly (never `git add -A`).

---

## File Structure

| File | Responsibility |
|---|---|
| `db/migrations/20260610203204_create_audit_events.up.sql` | Partitioned `audit_events` table, indexes, immutability trigger + function |
| `db/migrations/20260610203204_create_audit_events.down.sql` | Tear down the above |
| `db/queries/audit.sql` | `CreateAuditEvent` insert query for sqlc |
| `internal/db/audit.sql.go` | sqlc-generated (do not hand-edit) |
| `internal/audit/event.go` | `Event` struct + action/resource-type constants (the trail's stable vocabulary) |
| `internal/audit/context.go` | `RequestMeta`, context helpers, `Middleware` capturing request_id/ip/user_agent |
| `internal/audit/recorder.go` | `Recorder.Record(ctx, tx, Event)` — actor resolution + JSONB marshalling + insert |
| `internal/audit/maintenance.go` | `EnsurePartitions` + `DropExpiredPartitions` |
| `internal/audit/handler.go` | Internal HTTP endpoint that runs maintenance (scheduler-secret protected) |
| `internal/audit/recorder_integration_test.go` | write/read-back, actor vs system, atomicity |
| `internal/audit/immutability_integration_test.go` | UPDATE/DELETE blocked by trigger |
| `internal/audit/maintenance_integration_test.go` | partition create + expiry drop |
| `internal/api/server.go` (modify) | Construct `Recorder`, mount `audit.Middleware`, register internal maintenance route, call `EnsurePartitions` at boot |
| `.env.example` (modify) | Document the audit maintenance scheduler usage |
| `infra/terraform/` (modify) | Cron wiring for `/internal/audit/maintenance` |
| `README.md` (modify) | Add `audit_events` to the schema/diagram section |

---

## Task 1: Migration — partitioned `audit_events` table + immutability trigger

**Files:**
- Create: `db/migrations/20260610203204_create_audit_events.up.sql`
- Create: `db/migrations/20260610203204_create_audit_events.down.sql`

- [ ] **Step 1: Write the up migration**

`db/migrations/20260610203204_create_audit_events.up.sql`:

```sql
-- Append-only audit trail. RANGE-partitioned by month on occurred_at so that
-- retention is a partition DROP (DDL) rather than row DELETE (DML). The PK must
-- include the partition key. Actor and resource ids are TEXT because user ids
-- are WorkOS string ids; resource ids hold either uuid-as-text or WorkOS ids.
CREATE TABLE IF NOT EXISTS audit_events (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    occurred_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actor_id      TEXT,
    actor_type    TEXT NOT NULL,
    actor_label   TEXT,
    action        TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id   TEXT,
    group_id      TEXT,
    old_values    JSONB,
    new_values    JSONB,
    metadata      JSONB,
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource
    ON audit_events (resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON audit_events (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_group
    ON audit_events (group_id, occurred_at DESC);

-- Immutability: rows may only be inserted, never changed or deleted. Retention
-- uses DROP/DETACH PARTITION (DDL), which does NOT fire this row-level trigger.
CREATE OR REPLACE FUNCTION audit_events_block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_block_mutation
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_block_mutation();
```

Note: no initial partitions are created here. `audit.EnsurePartitions` (Task 5) creates the rolling window at app boot and in tests.

- [ ] **Step 2: Write the down migration**

`db/migrations/20260610203204_create_audit_events.down.sql`:

```sql
DROP TABLE IF EXISTS audit_events CASCADE;
DROP FUNCTION IF EXISTS audit_events_block_mutation();
```

- [ ] **Step 3: Verify the migration applies cleanly**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && make infra:restart && make db"
```
(If the repo has a dedicated `make db:migrate` target, use it; otherwise `make db` applies migrations. Confirm the Makefile target name first.)
Expected: migration `20260610203204` applies with no error; `\d+ audit_events` shows `Partition key: RANGE (occurred_at)`.

- [ ] **Step 4: Commit**

```
git add db/migrations/20260610203204_create_audit_events.up.sql db/migrations/20260610203204_create_audit_events.down.sql
git commit -m "feat(audit): add append-only partitioned audit_events table"
```

---

## Task 2: sqlc query + code generation

**Files:**
- Create: `db/queries/audit.sql`
- Generated: `internal/db/audit.sql.go`, `internal/db/models.go` (regenerated), `internal/db/querier.go` (regenerated)

- [ ] **Step 1: Write the insert query**

`db/queries/audit.sql`:

```sql
-- name: CreateAuditEvent :exec
INSERT INTO audit_events (
    actor_id, actor_type, actor_label, action,
    resource_type, resource_id, group_id,
    old_values, new_values, metadata
) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7,
    $8, $9, $10
);
```

`occurred_at` and `id` use their column defaults — no `RETURNING` needed for an `:exec` query.

- [ ] **Step 2: Generate sqlc code**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && make db:sqlc"
```
Expected: success, and `internal/db/audit.sql.go` now defines `CreateAuditEvent` + `CreateAuditEventParams`.

If sqlc errors on `PARTITION BY` or the trigger/function: confirm sqlc version is ≥ v1.27 (the repo uses v1.30, which parses declarative partitioning and treats `CREATE FUNCTION` bodies as opaque). The `CREATE TRIGGER` and plpgsql function are ignored by the type generator. Do not remove the partition clause — it is load-bearing for retention.

- [ ] **Step 3: Verify it compiles**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && make api:build"
```
Expected: build succeeds.

- [ ] **Step 4: Inspect generated param types**

Open `internal/db/audit.sql.go` and confirm `CreateAuditEventParams` fields are:
`ActorID pgtype.Text`, `ActorType string`, `ActorLabel pgtype.Text`, `Action string`, `ResourceType string`, `ResourceID pgtype.Text`, `GroupID pgtype.Text`, `OldValues []byte`, `NewValues []byte`, `Metadata []byte`.
(If JSONB maps to a different type in this codebase, note the actual type — Task 4 marshals to it.)

- [ ] **Step 5: Commit**

```
git add db/queries/audit.sql internal/db/audit.sql.go internal/db/models.go internal/db/querier.go internal/db/mocks/mock_querier.go
git commit -m "feat(audit): generate CreateAuditEvent sqlc query"
```

---

## Task 3: Event taxonomy (`internal/audit/event.go`)

**Files:**
- Create: `internal/audit/event.go`

- [ ] **Step 1: Write the event vocabulary**

`internal/audit/event.go`:

```go
// Package audit records an append-only trail of who did what, when. Events are
// written in the same transaction as the mutation they describe.
package audit

// Resource types — the kind of entity an event is about.
const (
	ResourceBooking         = "booking"
	ResourceCoachingSession = "coaching_session"
	ResourceRecording       = "recording"
	ResourceReview          = "review"
	ResourceGroup           = "group"
	ResourceGroupMembership = "group_membership"
	ResourceGroupInvite     = "group_invite"
	ResourceAsset           = "asset"
	ResourceVideo           = "video"
	ResourceProfile         = "profile"
)

// Actions — stable verbs. These names are part of the trail's contract; never
// rename an existing one (downstream queries and exports depend on them).
const (
	ActionBookingCreated     = "booking.created"
	ActionBookingCancelled   = "booking.cancelled"
	ActionBookingRescheduled = "booking.rescheduled"

	ActionCoachingSessionConducted = "coaching_session.conducted"

	ActionRecordingCreated = "recording.created"
	ActionRecordingDeleted = "recording.deleted"

	ActionReviewCreated = "review.created"
	ActionReviewUpdated = "review.updated"
	ActionReviewDeleted = "review.deleted"

	ActionGroupCreated = "group.created"
	ActionGroupUpdated = "group.updated"
	ActionGroupDeleted = "group.deleted"

	ActionGroupMembershipAdded   = "group_membership.added"
	ActionGroupMembershipRemoved = "group_membership.removed"
	ActionGroupMembershipLeft    = "group_membership.left"

	ActionGroupInviteCreated  = "group_invite.created"
	ActionGroupInviteAccepted = "group_invite.accepted"
	ActionGroupInviteRevoked  = "group_invite.revoked"

	ActionAssetDeleted = "asset.deleted"
	ActionVideoDeleted = "video.deleted"

	ActionProfileUpdated = "profile.updated"
)

// Event describes a single audited mutation. ResourceID and GroupID are empty
// strings when not applicable (stored as SQL NULL).
//
// OldValues/NewValues MUST be a *curated snapshot DTO*, never a raw db row.
// Marshalling a db.* struct directly couples the audit format to DB migrations
// and leaks unfiltered PII. Each snapshot type carries a `_v` schema version
// (start at 1; bump only on breaking shape changes) and includes only the fields
// you intentionally want in the trail (no tokens, no full profiles, no email
// bodies). See the design spec, "Schema-Evolution der Snapshots".
type Event struct {
	Action       string
	ResourceType string
	ResourceID   string
	GroupID      string
	OldValues    any
	NewValues    any
}
```

**Snapshot contract (applies to every rollout plan, not built here):** each domain
defines its own curated snapshot DTO with a `_v` tag, e.g.

```go
type bookingSnapshot struct {
	V           int    `json:"_v"` // start at 1
	ExpertID    string `json:"expert_id"`
	StudentID   string `json:"student_id"`
	ScheduledAt string `json:"scheduled_at"`
	DurationMin int32  `json:"duration_min"`
	IsCancelled bool   `json:"is_cancelled"`
	// deliberately NOT: internal columns, unfiltered PII
}
```

Additive field changes keep `_v`; breaking changes (rename/remove/semantic shift)
bump `_v`. Old rows are never migrated (the trigger forbids UPDATE) — readers are
tolerant (schema-on-read).

- [ ] **Step 2: Verify it compiles**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go build ./internal/audit/..."
```
Expected: success (no symbols used yet, but the package compiles).

- [ ] **Step 3: Commit**

```
git add internal/audit/event.go
git commit -m "feat(audit): define event taxonomy and Event struct"
```

---

## Task 4: Request-metadata context middleware (`internal/audit/context.go`)

**Files:**
- Create: `internal/audit/context.go`

- [ ] **Step 1: Write the context helpers + middleware**

`internal/audit/context.go`:

```go
package audit

import (
	"context"
	"net"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// RequestMeta is the request-scoped context captured for each audit event.
type RequestMeta struct {
	RequestID string
	IP        string
	UserAgent string
}

type ctxKey struct{}

// WithRequestMeta stores request metadata in ctx.
func WithRequestMeta(ctx context.Context, m RequestMeta) context.Context {
	return context.WithValue(ctx, ctxKey{}, m)
}

// requestMetaFrom returns the stored RequestMeta (zero value if absent).
func requestMetaFrom(ctx context.Context) RequestMeta {
	m, _ := ctx.Value(ctxKey{}).(RequestMeta)
	return m
}

// Middleware captures request_id, user-agent and — only when captureIP is true —
// the client IP into the context so the Recorder can attach them to every event
// without per-handler boilerplate. IP is opt-in because it is personal data; the
// caller passes the AUDIT_CAPTURE_IP setting (default off).
func Middleware(captureIP bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get("X-Request-Id")
			if requestID == "" {
				requestID = uuid.New().String()
			}
			meta := RequestMeta{
				RequestID: requestID,
				UserAgent: r.UserAgent(),
			}
			if captureIP {
				meta.IP = clientIP(r)
			}
			ctx := WithRequestMeta(r.Context(), meta)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go build ./internal/audit/..."
```
Expected: success.

- [ ] **Step 3: Commit**

```
git add internal/audit/context.go
git commit -m "feat(audit): add request-metadata context middleware"
```

---

## Task 5: Recorder (`internal/audit/recorder.go`) — TDD

**Files:**
- Create: `internal/audit/recorder.go`
- Test: `internal/audit/recorder_integration_test.go`

- [ ] **Step 1: Write the failing integration test**

`internal/audit/recorder_integration_test.go`:

```go
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
	row := pool.QueryRow(ctx,
		`SELECT actor_type, actor_id FROM audit_events WHERE action = $1`,
		audit.ActionRecordingCreated)
	if err := row.Scan(&actorType, &actorID); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if actorType != "system" || actorID != nil {
		t.Errorf("actor_type=%q actor_id=%v, want system/NULL", actorType, actorID)
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
```

- [ ] **Step 2: Run the test — expect a build failure**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go test -tags=integration ./internal/audit/... -run TestIntegration_Recorder -v"
```
Expected: FAIL — `undefined: audit.NewRecorder` and `audit.EnsurePartitions` (the latter lands in Task 6; this task may temporarily stub it — see Step 3 note).

- [ ] **Step 3: Implement the Recorder**

`internal/audit/recorder.go`:

```go
package audit

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
)

// Recorder writes audit events. It is stateless and safe for concurrent use.
type Recorder struct{}

// NewRecorder constructs a Recorder.
func NewRecorder() *Recorder { return &Recorder{} }

// Record writes one event inside the supplied transaction handle (a pgx.Tx or
// pool). The audit row commits or rolls back atomically with the caller's
// mutation. The actor is resolved from the context; absent a user it is recorded
// as the system actor.
func (r *Recorder) Record(ctx context.Context, tx db.DBTX, e Event) error {
	q := db.New(tx)

	actorType := "system"
	var actorID, actorLabel pgtype.Text
	if u := auth.GetUser(ctx); u != nil {
		actorType = "user"
		actorID = text(u.ID)
		label := strings.TrimSpace(u.FirstName + " " + u.LastName)
		if label == "" {
			label = u.Email
		}
		actorLabel = text(label)
	}

	meta := requestMetaFrom(ctx)
	metaJSON, err := json.Marshal(map[string]string{
		"request_id": meta.RequestID,
		"ip":         meta.IP,
		"user_agent": meta.UserAgent,
	})
	if err != nil {
		return err
	}

	oldJSON, err := marshalOrNil(e.OldValues)
	if err != nil {
		return err
	}
	newJSON, err := marshalOrNil(e.NewValues)
	if err != nil {
		return err
	}

	return q.CreateAuditEvent(ctx, db.CreateAuditEventParams{
		ActorID:      actorID,
		ActorType:    actorType,
		ActorLabel:   actorLabel,
		Action:       e.Action,
		ResourceType: e.ResourceType,
		ResourceID:   text(e.ResourceID),
		GroupID:      text(e.GroupID),
		OldValues:    oldJSON,
		NewValues:    newJSON,
		Metadata:     metaJSON,
	})
}

func text(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

func marshalOrNil(v any) ([]byte, error) {
	if v == nil {
		return nil, nil
	}
	return json.Marshal(v)
}
```

Note on `db.DBTX`: `pgx.Tx` and `*pgxpool.Pool` both satisfy `db.DBTX` (Exec/Query/QueryRow), so callers pass their `tx` directly. If `make db:sqlc` produced a JSONB type other than `[]byte` (Task 2 Step 4), change `marshalOrNil`'s return type and the param fields to match.

- [ ] **Step 4: Run the test — expect PASS**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go test -tags=integration ./internal/audit/... -run TestIntegration_Recorder -v"
```
Expected: PASS (after Task 6 lands `EnsurePartitions`; if implementing strictly in order, temporarily add a minimal `EnsurePartitions` stub in `maintenance.go` now and flesh it out in Task 6).

- [ ] **Step 5: Commit**

```
git add internal/audit/recorder.go internal/audit/recorder_integration_test.go
git commit -m "feat(audit): add Recorder writing events in-transaction"
```

---

## Task 6: Partition maintenance (`internal/audit/maintenance.go`) — TDD

**Files:**
- Create: `internal/audit/maintenance.go`
- Test: `internal/audit/maintenance_integration_test.go`

- [ ] **Step 1: Write the failing test**

`internal/audit/maintenance_integration_test.go`:

```go
//go:build integration

package audit_test

import (
	"context"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/audit"
	"github.com/OZIOisgood/zeta/internal/testdb"
)

func countPartitions(t *testing.T, ctx context.Context, pool interface {
	QueryRow(context.Context, string, ...any) interface {
		Scan(...any) error
	}
}) int {
	t.Helper()
	return 0 // replaced below; see real impl using pool.QueryRow
}

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
	// current month + 3 ahead + 1 previous = at least 4 partitions.
	if n < 4 {
		t.Errorf("partition count = %d, want >= 4", n)
	}
}

func TestIntegration_DropExpiredPartitions_RemovesOld(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if err := audit.EnsurePartitions(ctx, pool); err != nil {
		t.Fatalf("EnsurePartitions: %v", err)
	}

	// Manually create a partition 40 months in the past (older than 3y).
	old := time.Now().AddDate(0, -40, 0)
	start := time.Date(old.Year(), old.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	name := "audit_events_" + start.Format("2006_01")
	if _, err := pool.Exec(ctx,
		`CREATE TABLE `+name+` PARTITION OF audit_events FOR VALUES FROM ($1) TO ($2)`,
		start, end); err != nil {
		t.Fatalf("create old partition: %v", err)
	}

	if err := audit.DropExpiredPartitions(ctx, pool, 3*365*24*time.Hour); err != nil {
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
```

Remove the placeholder `countPartitions` helper before running — it is illustrative only; the tests above use `pool.QueryRow` directly.

- [ ] **Step 2: Run the test — expect failure**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go test -tags=integration ./internal/audit/... -run TestIntegration_.*Partitions -v"
```
Expected: FAIL — `undefined: audit.EnsurePartitions` / `audit.DropExpiredPartitions`.

- [ ] **Step 3: Implement maintenance**

`internal/audit/maintenance.go`:

```go
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
```

- [ ] **Step 4: Run the test — expect PASS**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go test -tags=integration ./internal/audit/... -run TestIntegration_.*Partitions -v"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add internal/audit/maintenance.go internal/audit/maintenance_integration_test.go
git commit -m "feat(audit): add partition create/expiry maintenance"
```

---

## Task 7: Immutability integration test

**Files:**
- Test: `internal/audit/immutability_integration_test.go`

- [ ] **Step 1: Write the test**

`internal/audit/immutability_integration_test.go`:

```go
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
	_, err := pool.Exec(ctx, `UPDATE audit_events SET action = 'tampered'`)
	if err == nil || !strings.Contains(err.Error(), "append-only") {
		t.Errorf("UPDATE error = %v, want append-only rejection", err)
	}

	// DELETE must be rejected by the trigger.
	_, err = pool.Exec(ctx, `DELETE FROM audit_events`)
	if err == nil || !strings.Contains(err.Error(), "append-only") {
		t.Errorf("DELETE error = %v, want append-only rejection", err)
	}
}
```

- [ ] **Step 2: Run the test — expect PASS**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go test -tags=integration ./internal/audit/... -run TestIntegration_AuditEvents_AreImmutable -v"
```
Expected: PASS (trigger raises on both UPDATE and DELETE).

- [ ] **Step 3: Commit**

```
git add internal/audit/immutability_integration_test.go
git commit -m "test(audit): verify audit_events are append-only"
```

---

## Task 8: Maintenance HTTP endpoint (`internal/audit/handler.go`)

**Files:**
- Create: `internal/audit/handler.go`

- [ ] **Step 1: Write the handler**

Mirrors the existing scheduler-secret pattern from `internal/coaching/reminder.go` (Authorization: `Bearer <secret>`, constant-time compare). Retention is configurable via `AUDIT_RETENTION_DAYS` (default 1095 = 3 years) — deliberately not hard-coded, so a pre-release deployment can set a short window without touching the partitioning mechanism.

`internal/audit/handler.go`:

```go
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
```

- [ ] **Step 2: Verify it compiles**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go build ./internal/audit/..."
```
Expected: success.

- [ ] **Step 3: Commit**

```
git add internal/audit/handler.go
git commit -m "feat(audit): add scheduler-protected maintenance endpoint"
```

---

## Task 9: Wire into the server

**Files:**
- Modify: `internal/api/server.go`

- [ ] **Step 1: Construct the Recorder + audit handler, mount middleware, register route, ensure partitions at boot**

In `internal/api/server.go`, inside `routes(ctx)`:

After `queries := db.New(s.Pool)` (line ~77), add:

```go
	auditRecorder := audit.NewRecorder()
	_ = auditRecorder // injected into domain handlers in the rollout plans
	auditHandler := audit.NewHandler(s.Pool, s.Logger, os.Getenv("SCHEDULER_SECRET"))

	// Create the current/near-future audit partitions so writes succeed before
	// the first scheduled maintenance run.
	if err := audit.EnsurePartitions(ctx, s.Pool); err != nil {
		s.Logger.Error("audit_ensure_partitions_failed", slog.Any("err", err))
	}
```

Add the audit context middleware to the global chain. After `s.Router.Use(auth.Middleware(s.Logger, jwksCache))` (line ~147), add (IP capture is opt-in via `AUDIT_CAPTURE_IP`, default off — reuse the existing `parseBool` helper):

```go
	s.Router.Use(audit.Middleware(parseBool(os.Getenv("AUDIT_CAPTURE_IP"))))
```

Register the internal maintenance route alongside the other `/internal/...` routes (after line ~201):

```go
	s.Router.Post("/internal/audit/maintenance", auditHandler.RunMaintenance)
```

Add the import `"github.com/OZIOisgood/zeta/internal/audit"` to the import block.

- [ ] **Step 2: Build**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && make api:build"
```
Expected: success.

- [ ] **Step 3: Run the full audit integration suite + unit tests**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && go test -tags=integration ./internal/audit/... -v && make test:unit"
```
Expected: all PASS.

- [ ] **Step 4: Commit**

```
git add internal/api/server.go
git commit -m "feat(audit): wire recorder, middleware and maintenance route into server"
```

---

## Task 10: Docs, env, infra

**Files:**
- Modify: `.env.example`
- Modify: `infra/terraform/` (the scheduler/cron module — match the existing coaching-reminders cron wiring)
- Modify: `README.md`

- [ ] **Step 1: Document the maintenance schedule in `.env.example`**

`audit_events` maintenance reuses the existing `SCHEDULER_SECRET`. Add a comment near the scheduler section plus the two new audit settings:

```
# Audit-trail partition maintenance (daily): POST /internal/audit/maintenance
# Authorization: Bearer ${SCHEDULER_SECRET}

# Audit retention window in days before a partition is dropped (default 1095 = 3y).
AUDIT_RETENTION_DAYS=1095
# Capture client IP into audit metadata. IP is personal data — opt-in, default off.
AUDIT_CAPTURE_IP=false
```

(If `SCHEDULER_SECRET` is not yet in `.env.example`, add it.)

- [ ] **Step 2: Add the cron wiring in Terraform**

Locate the Terraform resource that schedules `POST /internal/coaching/reminders` (Cloud Scheduler / cron) and add an analogous daily job targeting `POST /internal/audit/maintenance` with the same `Authorization: Bearer <SCHEDULER_SECRET>` header. Suggested cadence: daily at 03:00 UTC.

- [ ] **Step 3: Update README schema/diagram**

Add `audit_events` to the database schema/diagram section: an append-only, monthly-partitioned table capturing actor/action/resource for mutations, configurable retention (default 3 years) via partition drop. Note that domain wiring is rolled out incrementally.

- [ ] **Step 4: Commit**

```
git add .env.example README.md infra/terraform
git commit -m "docs(audit): document maintenance schedule, infra cron and schema"
```

---

## Self-Review

- **Spec coverage:** Table/columns (Task 1) ✓ · TEXT actor/resource ids correcting the spec ✓ · partitioning + immutability trigger (Task 1) ✓ · sqlc insert (Task 2) ✓ · event taxonomy (Task 3) ✓ · actor-from-context + system fallback + point-in-time label (Task 5) ✓ · metadata middleware (Task 4) ✓ · in-transaction atomicity (Task 5 rollback test) ✓ · 3-year retention via partition drop (Task 6/8) ✓ · server wiring (Task 9) ✓ · DSGVO/PII handled via curated PII-minimized snapshot DTOs (Task 3 doc-comment + Snapshot contract) ✓ · snapshot schema-evolution: curated DTO + `_v`, schema-on-read (Task 3) ✓ · docs/infra (Task 10) ✓. **Out of scope by design:** per-domain handler wiring → rollout plans.
- **Placeholder scan:** The illustrative `countPartitions` helper in Task 6 Step 1 is explicitly flagged for removal before running. No other placeholders.
- **Type consistency:** `Recorder.Record(ctx, db.DBTX, Event)`, `EnsurePartitions(ctx, *pgxpool.Pool)`, `DropExpiredPartitions(ctx, *pgxpool.Pool, time.Duration)`, `NewRecorder()`, `NewHandler(pool, logger, secret)` — used consistently across tasks. `text()` helper and `pgtype.Text` params match Task 2 Step 4’s expected generated types (verify in Task 2).

---

## Rollout Roadmap (separate plans — write each via writing-plans when ready)

Each domain plan injects `*audit.Recorder` into the handler, converts the relevant mutation(s) to a `pool.Begin → db.New(tx) → mutation + rec.Record → Commit` transaction, and adds a per-event integration test asserting the correct `action`/actor/`resource_id`.

Each domain also defines its own **curated snapshot DTO(s) with a `_v` tag** (see the Snapshot contract in Task 3) and passes those — never raw `db.*` rows — as `Event.OldValues`/`NewValues`.

1. **Groups** — `group.created|updated|deleted`, `group_membership.added|removed|left`, `group_invite.created|accepted|revoked`. Touches `internal/groups`, `internal/users` (RemoveGroupUser), `internal/invitations`. Needs pool injected (currently Querier-only).
2. **Coaching bookings** — `booking.created|cancelled|rescheduled`. `internal/coaching` already has the pool; lightest rollout.
3. **Live coaching + recordings** — `coaching_session.conducted`, `recording.created|deleted` (includes system-actor paths: webhooks/jobs).
4. **Reviews** — `review.created|updated|deleted`. `internal/reviews` needs pool injected.
5. **Assets/videos** — `asset.deleted`, `video.deleted`. `internal/assets` needs pool injected.
6. **Profile** — `profile.updated`. `internal/users`/`auth` UpdateMe.

Suggested order: 2 (proves the end-to-end pattern with the least refactor) → 1 → 4 → 5 → 3 → 6.
