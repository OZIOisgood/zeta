# Audit Review Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 findings from the code review of the audit-trail foundation (PR #14) — 4 critical correctness/security issues, 3 confirmed correctness bugs, 3 cleanup/hardening items.

**Architecture:** All changes stay within the existing structure: `internal/audit` (recorder, context, maintenance, handler), `internal/logger` (request-id sharing), a new shared scheduler-secret middleware in `internal/auth` consolidating 5 hand-rolled copies, and boot-time partition creation moved from the HTTP layer to `cmd/api/main.go` (fail-fast, matching the pool convention).

**Tech Stack:** Go, chi, pgx/v5 + pgxpool, sqlc, testcontainers (integration tag), golang-migrate.

---

**Branch:** `feat/audit-trail` (PR #14 is open from this branch — these fixes land as additional commits).

**Conventions:**
- Commands assume a **Windows host driving WSL**: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta && export PATH="/usr/local/go/bin:$HOME/go/bin:$PATH" && <cmd>'`. If the session already runs inside WSL, drop the wrapper.
- After editing any `.go` file run `gofmt -w <file>` (CRLF safety on UNC edits).
- Integration tests: `go test -tags=integration ./internal/audit/... -v` (requires Docker).
- Stage files explicitly; never `git add -A`; no co-author trailers.

**Findings → Tasks map:**

| # | Finding | Task |
|---|---------|------|
| 1 | XFF leftmost spoofable | T1 |
| 5 | Request-ID divergence logger↔audit | T2 |
| 7 | metadata `{}` statt NULL | T3 |
| 4 | Record akzeptiert Pool (Atomarität) | T4 |
| 6 | Schema-qualifizierte Partitionsnamen | T5 |
| 10 | Unquotierte DDL-Identifier | T5 |
| 9 | Retention-Config-Altitude | T6 |
| 3 | Leeres SCHEDULER_SECRET ohne Warnung | T7 |
| 8 | 5. Kopie Bearer-Secret-Check | T7 |
| 2 | Boot-EnsurePartitions verschluckt / falsche Ebene | T8 |

---

## File Structure

| File | Change |
|---|---|
| `internal/audit/context.go` | clientIP rightmost-XFF; Middleware liest logger-Request-ID |
| `internal/audit/context_test.go` | NEU: Unit-Tests clientIP + Request-ID-Reuse |
| `internal/logger/middleware.go` | Request-ID in abrufbaren Context-Key legen |
| `internal/audit/recorder.go` | metadata nil bei leer; `Record(ctx, tx pgx.Tx, e)` |
| `internal/audit/recorder_integration_test.go` | NULL-metadata-Assertion |
| `internal/audit/maintenance.go` | Schema-Qualifier strippen; `pgx.Identifier.Sanitize()` |
| `internal/audit/maintenance_test.go` | Testfälle für qualifizierte Namen |
| `internal/audit/handler.go` | Retention als Parameter; Secret-Check raus (→ Middleware) |
| `internal/auth/scheduler.go` | NEU: `RequireSchedulerSecret` Middleware |
| `internal/auth/scheduler_test.go` | NEU: Middleware-Unit-Tests |
| `internal/coaching/reminder.go`, `recording.go`, `recording_import.go`, `handler.go` | Inline-Secret-Checks + Feld/Config entfernen |
| `internal/assets/handler.go`, `handler_test.go` | Inline-Check + Param entfernen; Tests auf Middleware umgebaut |
| `internal/api/server.go` | /internal-Routengruppe mit Middleware; Retention-Berechnung; EnsurePartitions-Block raus |
| `cmd/api/main.go` | EnsurePartitions fail-fast nach Pool-Erstellung |

---

## Task 1: clientIP — rightmost X-Forwarded-For (Finding 1)

**Files:**
- Modify: `internal/audit/context.go` (clientIP)
- Create: `internal/audit/context_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/audit/context_test.go`:

```go
package audit

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientIP_UsesRightmostXFF(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	// Leftmost entries are client-supplied and forgeable; the trusted proxy
	// (Cloud Run / GFE) appends the real client IP as the rightmost entry.
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 198.51.100.9, 203.0.113.7")
	if got := clientIP(r); got != "203.0.113.7" {
		t.Errorf("clientIP = %q, want 203.0.113.7 (rightmost)", got)
	}
}

func TestClientIP_FallsBackToRemoteAddr(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil) // RemoteAddr = 192.0.2.1:1234
	if got := clientIP(r); got != "192.0.2.1" {
		t.Errorf("clientIP = %q, want 192.0.2.1", got)
	}
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `go test ./internal/audit/ -run TestClientIP -v`
Expected: `TestClientIP_UsesRightmostXFF` FAILS (current code returns `6.6.6.6`).

- [ ] **Step 3: Fix clientIP**

In `internal/audit/context.go` replace the `clientIP` function:

```go
func clientIP(r *http.Request) string {
	// X-Forwarded-For accumulates hops left-to-right; only the RIGHTMOST entry
	// was appended by our trusted proxy (Cloud Run / Google Front End). Leftmost
	// entries are client-controlled and trivially forgeable — never trust them
	// in a forensic trail.
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `go test ./internal/audit/ -run TestClientIP -v` → PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/audit/context.go internal/audit/context_test.go
git commit -m "fix(audit): use rightmost X-Forwarded-For entry for client IP"
```

---

## Task 2: Eine Request-ID für Logs und Audit (Finding 5)

**Files:**
- Modify: `internal/logger/middleware.go`
- Modify: `internal/audit/context.go` (Middleware)
- Test: `internal/audit/context_test.go` (append)

- [ ] **Step 1: Expose the request id from the logger middleware**

In `internal/logger/middleware.go`: add `"context"` to imports, then add above `Middleware`:

```go
type requestIDKey struct{}

// WithRequestID stores the request id in ctx so downstream middlewares (e.g.
// audit) reuse the SAME id instead of generating their own.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

// RequestIDFromContext returns the request id set by Middleware ("" if absent).
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}
```

Inside `Middleware`, change the context construction (currently `ctx := With(r.Context(), baseLogger, ...)`) to:

```go
		ctx := WithRequestID(r.Context(), requestID)
		ctx = With(ctx, baseLogger,
			slog.String("request_id", requestID),
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
		)
```

- [ ] **Step 2: Write the failing test (append to `internal/audit/context_test.go`)**

```go
func TestMiddleware_ReusesLoggerRequestID(t *testing.T) {
	var auditID, loggerID string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auditID = requestMetaFrom(r.Context()).RequestID
		loggerID = logger.RequestIDFromContext(r.Context())
	})
	chain := logger.Middleware(slog.New(slog.NewTextHandler(io.Discard, nil)))(Middleware(false)(inner))

	// No X-Request-Id header: both middlewares must agree on ONE generated id.
	chain.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	if auditID == "" || auditID != loggerID {
		t.Errorf("audit request_id %q != logger request_id %q", auditID, loggerID)
	}

	// Explicit header: both must carry it through.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "fixed-id")
	chain.ServeHTTP(httptest.NewRecorder(), req)
	if auditID != "fixed-id" || loggerID != "fixed-id" {
		t.Errorf("got audit=%q logger=%q, want both fixed-id", auditID, loggerID)
	}
}
```

Add to the test file's imports: `"io"`, `"log/slog"`, `"github.com/OZIOisgood/zeta/internal/logger"`.

- [ ] **Step 3: Run — expect FAIL** (build error `RequestIDFromContext` exists now, assertion fails: two different UUIDs)

Run: `go test ./internal/audit/ -run TestMiddleware_ReusesLoggerRequestID -v`

- [ ] **Step 4: Make audit.Middleware consume the shared id**

In `internal/audit/context.go`, add import `"github.com/OZIOisgood/zeta/internal/logger"` and change the requestID resolution inside `Middleware` to:

```go
			requestID := logger.RequestIDFromContext(r.Context())
			if requestID == "" {
				// logger.Middleware not in the chain (tests, sub-mounts):
				// fall back to header / fresh UUID.
				requestID = r.Header.Get("X-Request-Id")
				if requestID == "" {
					requestID = uuid.New().String()
				}
			}
```

- [ ] **Step 5: Run — expect PASS**, plus logger package tests

Run: `go test ./internal/audit/ ./internal/logger/ -v` → PASS.

- [ ] **Step 6: Commit**

```bash
git add internal/logger/middleware.go internal/audit/context.go internal/audit/context_test.go
git commit -m "fix(audit): share one request id between logger and audit middleware"
```

---

## Task 3: metadata NULL statt `{}` (Finding 7)

**Files:**
- Modify: `internal/audit/recorder.go`
- Modify: `internal/audit/recorder_integration_test.go`

- [ ] **Step 1: Extend the integration test (failing first)**

In `TestIntegration_Recorder_SystemActorWhenNoUser` (recorder_integration_test.go), replace the scan block with:

```go
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
```

- [ ] **Step 2: Run — expect FAIL** (`metadata = {}`)

Run: `go test -tags=integration ./internal/audit/... -run TestIntegration_Recorder_SystemActorWhenNoUser -v`

- [ ] **Step 3: Fix the recorder**

In `internal/audit/recorder.go`, replace the `metaJSON, err := json.Marshal(metaMap)` block with:

```go
	var metaJSON []byte
	if len(metaMap) > 0 {
		b, err := json.Marshal(metaMap)
		if err != nil {
			return err
		}
		metaJSON = b
	}
```

- [ ] **Step 4: Run — expect PASS** (same command as Step 2).

- [ ] **Step 5: Commit**

```bash
git add internal/audit/recorder.go internal/audit/recorder_integration_test.go
git commit -m "fix(audit): store NULL metadata instead of empty JSON object"
```

---

## Task 4: Record verlangt pgx.Tx (Finding 4)

**Files:**
- Modify: `internal/audit/recorder.go`

- [ ] **Step 1: Change the signature and doc comment**

In `internal/audit/recorder.go`: add import `"github.com/jackc/pgx/v5"`, then replace the `Record` doc comment + signature:

```go
// Record writes one event inside the supplied transaction. The parameter is
// deliberately pgx.Tx — NOT db.DBTX — so the atomicity contract is enforced at
// compile time: the audit row commits or rolls back together with the caller's
// mutation, never independently. Passing a bare pool is a design violation.
func (r *Recorder) Record(ctx context.Context, tx pgx.Tx, e Event) error {
```

(`db.New(tx)` keeps working — `pgx.Tx` satisfies `db.DBTX`.)

- [ ] **Step 2: Build + run all audit tests**

Run: `go build ./... && go test ./internal/audit/ -v && go test -tags=integration ./internal/audit/... -v`
Expected: all PASS (integration tests already pass `pool.Begin()` results, i.e. `pgx.Tx`).

- [ ] **Step 3: Commit**

```bash
git add internal/audit/recorder.go
git commit -m "fix(audit): require pgx.Tx in Record to enforce atomicity at compile time"
```

---

## Task 5: Schema-qualifizierte Partitionsnamen + Identifier-Quoting (Findings 6, 10)

**Files:**
- Modify: `internal/audit/maintenance.go`
- Modify: `internal/audit/maintenance_test.go`

- [ ] **Step 1: Add failing unit-test cases**

In `TestPartitionUpperBound` (maintenance_test.go), add to the `cases` slice:

```go
		{"public.audit_events_2026_06", true, 2026, time.July},   // schema-qualified (non-default search_path)
		{"audit.audit_events_2026_03", true, 2026, time.April},   // arbitrary schema
		{"public.other_table", false, 0, 0},
```

- [ ] **Step 2: Run — expect FAIL** (qualified names currently return ok=false)

Run: `go test ./internal/audit/ -run TestPartitionUpperBound -v`

- [ ] **Step 3: Implement**

In `internal/audit/maintenance.go`: add imports `"strings"` and `"github.com/jackc/pgx/v5"`.

Replace `partitionUpperBound`:

```go
// partitionUpperBound parses the exclusive upper bound from a managed partition
// name like "audit_events_2026_06" -> 2026-07-01. regclass::text returns a
// schema-qualified name ("public.audit_events_2026_06") when the table's schema
// is not on the search_path, so any qualifier is stripped before matching —
// otherwise expired partitions would silently never be dropped.
func partitionUpperBound(name string) (time.Time, bool) {
	bare := name
	if i := strings.LastIndexByte(bare, '.'); i >= 0 {
		bare = bare[i+1:]
	}
	const prefix = "audit_events_"
	if len(bare) <= len(prefix) || bare[:len(prefix)] != prefix {
		return time.Time{}, false
	}
	start, err := time.Parse("2006_01", bare[len(prefix):])
	if err != nil {
		return time.Time{}, false
	}
	return start.AddDate(0, 1, 0), true
}
```

In `EnsurePartitions`, replace the `stmt := fmt.Sprintf(...)` with the sanitized identifier:

```go
		stmt := fmt.Sprintf(
			`CREATE TABLE IF NOT EXISTS %s PARTITION OF audit_events FOR VALUES FROM ('%s') TO ('%s')`,
			pgx.Identifier{name}.Sanitize(), start.Format("2006-01-02"), end.Format("2006-01-02"),
		)
```

In `DropExpiredPartitions`, replace the drop loop body:

```go
	for _, name := range names {
		end, ok := partitionUpperBound(name)
		if !ok {
			continue // not a managed monthly partition; skip
		}
		if !end.After(cutoff) {
			// Names come from the pg catalog and may be schema-qualified; quote
			// each part so a crafted or unusual identifier cannot break the DDL.
			ident := pgx.Identifier{name}
			if i := strings.LastIndexByte(name, '.'); i >= 0 {
				ident = pgx.Identifier{name[:i], name[i+1:]}
			}
			if _, err := pool.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s`, ident.Sanitize())); err != nil {
				return fmt.Errorf("drop partition %s: %w", name, err)
			}
		}
	}
```

- [ ] **Step 4: Run unit + integration — expect PASS**

Run: `go test ./internal/audit/ -run TestPartition -v && go test -tags=integration ./internal/audit/... -run 'TestIntegration_.*Partitions' -v`

- [ ] **Step 5: Commit**

```bash
git add internal/audit/maintenance.go internal/audit/maintenance_test.go
git commit -m "fix(audit): handle schema-qualified partition names and quote DDL identifiers"
```

---

## Task 6: Retention als injizierte Config (Finding 9)

**Files:**
- Modify: `internal/audit/handler.go`
- Modify: `internal/api/server.go`

- [ ] **Step 1: Handler nimmt retention als Parameter**

In `internal/audit/handler.go`: delete `retentionFromEnv()` entirely, remove the now-unused `"os"` and `"strconv"` imports, and change struct + constructor:

```go
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
```

(`DefaultRetentionDays` bleibt exportiert — Tests nutzen sie.)

- [ ] **Step 2: server.go liest Env zentral (Repo-Konvention) und injiziert**

In `internal/api/server.go`, replace the `auditHandler := ...` line with:

```go
	auditRetention := time.Duration(parseIntOrDefault(os.Getenv("AUDIT_RETENTION_DAYS"), audit.DefaultRetentionDays)) * 24 * time.Hour
	auditHandler := audit.NewHandler(s.Pool, s.Logger, os.Getenv("SCHEDULER_SECRET"), auditRetention)
```

- [ ] **Step 3: Build + Tests**

Run: `make api:build && make test:unit` → PASS.

- [ ] **Step 4: Commit**

```bash
git add internal/audit/handler.go internal/api/server.go
git commit -m "fix(audit): inject retention via config instead of env read in package"
```

---

## Task 7: Gemeinsame Scheduler-Secret-Middleware, alle 5 Kopien konsolidieren (Findings 3, 8)

**Files:**
- Create: `internal/auth/scheduler.go`, `internal/auth/scheduler_test.go`
- Modify: `internal/audit/handler.go`, `internal/coaching/reminder.go`, `internal/coaching/recording.go`, `internal/coaching/recording_import.go`, `internal/coaching/handler.go`, `internal/assets/handler.go`, `internal/assets/handler_test.go`, `internal/api/server.go`

- [ ] **Step 1: Write the failing middleware test**

Create `internal/auth/scheduler_test.go`:

```go
package auth_test

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
)

func schedulerTestChain(secret string) http.Handler {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	return auth.RequireSchedulerSecret(secret, log)(ok)
}

func TestRequireSchedulerSecret(t *testing.T) {
	cases := []struct {
		name       string
		secret     string
		authHeader string
		want       int
	}{
		{"correct secret", "s3cret", "Bearer s3cret", http.StatusOK},
		{"wrong secret", "s3cret", "Bearer wrong", http.StatusUnauthorized},
		{"missing header", "s3cret", "", http.StatusUnauthorized},
		{"empty configured secret locks endpoint", "", "Bearer anything", http.StatusUnauthorized},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/internal/x", nil)
			if c.authHeader != "" {
				req.Header.Set("Authorization", c.authHeader)
			}
			rec := httptest.NewRecorder()
			schedulerTestChain(c.secret).ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Errorf("got %d, want %d", rec.Code, c.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run — expect BUILD FAIL** (`auth.RequireSchedulerSecret` undefined)

Run: `go test ./internal/auth/ -run TestRequireSchedulerSecret -v`

- [ ] **Step 3: Implement the middleware**

Create `internal/auth/scheduler.go`:

```go
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
```

- [ ] **Step 4: Run — expect PASS** (same command as Step 2).

- [ ] **Step 5: Route group in server.go**

In `internal/api/server.go`, replace the four existing internal-route registrations AND the audit one (lines à la `s.Router.Post("/internal/...", ...)`) with one protected group:

```go
	// Internal routes (not behind user auth — protected by the scheduler secret)
	s.Router.Group(func(r chi.Router) {
		r.Use(auth.RequireSchedulerSecret(os.Getenv("SCHEDULER_SECRET"), s.Logger))
		r.Post("/internal/coaching/reminders", coachingHandler.ProcessReminders)
		r.Post("/internal/coaching/recordings/cleanup", coachingHandler.CleanupFinishedRecordings)
		r.Post("/internal/coaching/recordings/process", coachingHandler.ProcessRecordingImports)
		r.Post("/internal/assets/durations/backfill", assetsHandler.BackfillVideoDurations)
		r.Post("/internal/audit/maintenance", auditHandler.RunMaintenance)
	})
```

- [ ] **Step 6: Strip the five inline checks**

a) `internal/audit/handler.go` — remove the secret check block in `RunMaintenance` (the `secret := r.Header.Get(...)` + `if h.schedulerSecret == "" || subtle...` lines), remove the `schedulerSecret` struct field and constructor param/assignment (final signature: `NewHandler(pool *pgxpool.Pool, logger *slog.Logger, retention time.Duration)`), remove the `"crypto/subtle"` import. Update the call in `server.go`:

```go
	auditHandler := audit.NewHandler(s.Pool, s.Logger, auditRetention)
```

b) `internal/coaching/reminder.go` — remove lines (comment + check):

```go
	// Validate scheduler secret via Authorization header.
	secret := r.Header.Get("Authorization")
	if h.schedulerSecret == "" || subtle.ConstantTimeCompare([]byte(secret), []byte("Bearer "+h.schedulerSecret)) != 1 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
```

and the `"crypto/subtle"` import.

c) `internal/coaching/recording.go` — remove the identical check block in `CleanupFinishedRecordings` (lines ~481-485, incl. the `secret :=` line) and the `"crypto/subtle"` import **if** no other use remains in the file (verify with grep).

d) `internal/coaching/recording_import.go` — remove the check block in `ProcessRecordingImports` (lines ~31-35) AND the `subtleCompareBearer` helper (lines ~352-354) and its `"crypto/subtle"` import.

e) `internal/coaching/handler.go` — remove the `schedulerSecret` struct field, the `SchedulerSecret` field from `HandlerConfig`, and the `schedulerSecret: cfg.SchedulerSecret,` assignment. In `server.go`, remove `SchedulerSecret: os.Getenv("SCHEDULER_SECRET"),` from the `coaching.HandlerConfig` literal.

f) `internal/assets/handler.go` — remove the check block in `BackfillVideoDurations` (~411-415), the `schedulerSecret` struct field, the `schedulerSecret string` constructor param + assignment, and the `"crypto/subtle"` import. In `server.go`, the assets construction becomes:

```go
	assetsHandler := assets.NewHandler(queries, muxClient, emailService, workosClient, s.Logger)
```

- [ ] **Step 7: Rewrite the assets tests** (they called the handler directly and asserted the in-handler 401)

In `internal/assets/handler_test.go`:

`TestBackfillVideoDurations_RejectsWithoutSecret` becomes a middleware-chain test:

```go
func TestBackfillVideoDurations_RejectsWithoutSecret(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default())
	protected := auth.RequireSchedulerSecret("scheduler-secret", slog.Default())(http.HandlerFunc(h.BackfillVideoDurations))

	req := httptest.NewRequest(http.MethodPost, "/internal/assets/durations/backfill", nil)
	req.Header.Set("Authorization", "Bearer wrong")
	rec := httptest.NewRecorder()

	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}
```

In `TestBackfillVideoDurations_UpdatesMissingDurations` and `TestBackfillVideoDurations_ResolvesViaUploadID`: change the constructor call to `NewHandler(q, mux, nil, nil, slog.Default())` and DELETE the now-meaningless `req.Header.Set("Authorization", "Bearer scheduler-secret")` lines (auth is no longer the handler's concern; they keep calling `h.BackfillVideoDurations(rec, req)` directly).

Add `"github.com/OZIOisgood/zeta/internal/auth"` to the test file imports.

- [ ] **Step 8: Build + full test suites**

Run: `make api:build && make test:unit && go test -tags=integration ./internal/audit/... -v`
Expected: all PASS (incl. coaching/assets unit tests — if any other test constructs the changed handlers, fix its constructor call the same way).

- [ ] **Step 9: Commit**

```bash
git add internal/auth/scheduler.go internal/auth/scheduler_test.go internal/audit/handler.go internal/coaching/reminder.go internal/coaching/recording.go internal/coaching/recording_import.go internal/coaching/handler.go internal/assets/handler.go internal/assets/handler_test.go internal/api/server.go
git commit -m "refactor(auth): consolidate scheduler-secret check into shared middleware"
```

---

## Task 8: EnsurePartitions fail-fast in main.go (Finding 2)

**Files:**
- Modify: `cmd/api/main.go`
- Modify: `internal/api/server.go`

- [ ] **Step 1: main.go — fail fast nach Pool-Erstellung**

In `cmd/api/main.go`: add import `"github.com/OZIOisgood/zeta/internal/audit"`, then directly after the `defer pool.Close()` line insert:

```go
	// Audit partitions must exist before any audited mutation commits. Fail
	// fast like the pool itself — serving with a broken forensic trail would
	// abort business transactions at runtime instead (audit insert error ⇒
	// transaction rollback by design).
	if err := audit.EnsurePartitions(ctx, pool); err != nil {
		baseLogger.ErrorContext(ctx, "audit_ensure_partitions_failed",
			slog.String("component", "audit"),
			slog.Any("err", err))
		panic(err)
	}
```

- [ ] **Step 2: server.go — Boot-Block entfernen**

In `internal/api/server.go` delete the block:

```go
	// Create the current/near-future audit partitions so writes succeed before
	// the first scheduled maintenance run.
	if err := audit.EnsurePartitions(ctx, s.Pool); err != nil {
		s.Logger.Error("audit_ensure_partitions_failed",
			slog.String("component", "audit"),
			slog.Any("err", err))
	}
```

(`audit` bleibt importiert — Middleware + NewHandler nutzen es weiter. If `ctx` in `routes(ctx)` is now only used by the notifications listener, leave the signature untouched.)

- [ ] **Step 3: Build + alles**

Run: `make api:build && make test:unit && go test -tags=integration ./internal/audit/... -v` → PASS.

- [ ] **Step 4: Commit**

```bash
git add cmd/api/main.go internal/api/server.go
git commit -m "fix(audit): create partitions fail-fast at startup in main"
```

---

## Final verification (after all tasks)

- [ ] `make infra:restart && make db` — re-apply migrations cleanly to the local dev DB (the up.sql was amended after first local apply; a fresh apply removes that drift), then `make api:build && make test:unit && go test -tags=integration ./internal/audit/... -v`.
- [ ] `git push` to update PR #14.

## Self-Review

- **Spec coverage:** alle 10 Findings → Tasks gemappt (Tabelle oben); Findings 3+8 bewusst in T7 kombiniert (die Startup-Warnung gehört in die eine kanonische Middleware), 6+10 in T5 (gleiche Funktion).
- **Placeholder scan:** keine TBDs; jede Code-Änderung mit vollständigem Code; Entfernungen mit zitiertem Ist-Code.
- **Type consistency:** `audit.NewHandler` endet nach T6+T7 als `(pool, logger, retention time.Duration)` — T7 Step 6a und server.go-Zeile stimmen überein; `RequireSchedulerSecret(secret string, logger *slog.Logger)` konsistent in T7 Steps 1/3/5/7; `Record(ctx, tx pgx.Tx, e Event)` (T4) wird von keinem späteren Task widersprochen.
