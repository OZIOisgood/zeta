# Invite-Code Soft Launch — Plan 1: Backend (Access Gate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Clubhouse-style access gate to the Go API: free registration, a per-user `waitlisted → active` status, and a post-login code-redeem endpoint that activates users (expert codes upgrade role to `expert`; existing group-invite codes activate students).

**Architecture:** Two new Postgres tables (`user_access`, `signup_codes`) via sqlc. A new `internal/access` package owns the redeem endpoint, the expert/admin code-management endpoints, and a `RequireActiveAccess` chi middleware that gates all existing protected feature routes. `/auth/me` is enriched with `access_status`. Role upgrades reuse the existing WorkOS membership + session-refresh machinery (no manual re-login). Activation status lives in our DB; the JWT is unchanged.

**Tech Stack:** Go, chi v5, sqlc (pgx/v5), golang-migrate, WorkOS `usermanagement` SDK v4, `go.uber.org/mock/gomock`, `log/slog`.

**Spec:** `.agents/plans/20260613181444_invite_code_soft_launch_design.md`

**Scope:** Backend only. Web dashboard (Plan 2) and mobile app (Plan 3, lands in PR #15) are separate. This branch (`feat/invite-code-soft-launch`) is based on `origin/main`; the mobile app code does not exist on `main`, so no mobile/openapi work happens here.

---

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `db/migrations/20260613190000_create_access_tables.{up,down}.sql` | `user_access` + `signup_codes` schema | Create |
| `db/migrations/20260613190100_backfill_user_access_active.{up,down}.sql` | Grandfather existing users to `active` | Create |
| `db/queries/access.sql` | sqlc queries for both tables | Create |
| `internal/db/*` | Generated models/querier (sqlc output) | Regenerate |
| `internal/db/mocks/mock_querier.go` | Generated Querier mock | Regenerate |
| `internal/auth/workos.go` | Add `UpdateOrganizationMembership` to `UserManagement` + wrapper | Modify |
| `internal/auth/mocks/mock_workos.go` | Generated WorkOS mock | Regenerate |
| `internal/auth/handler.go` | Exported `RefreshSessionCookies`; `access_status` in `Me` | Modify |
| `internal/access/codes.go` | Code generation + allotment constant | Create |
| `internal/access/handler.go` | Redeem, ListCodes, GenerateCodes, `RequireActiveAccess` | Create |
| `internal/access/handler_test.go` | Unit tests (mocked Querier + WorkOS) | Create |
| `internal/api/server.go` | Construct + wire access handler; gate protected routes | Modify |
| `README.md` | Update tables / user-journey notes | Modify |

**Boundaries:** `access` imports `auth` (for `GetUser`, `UserManagement`, the `SessionRefresher` it consumes) and `db`/`permissions`. `auth` must NOT import `access` (no cycle). The `SessionRefresher` interface is declared in `access` and satisfied by `*auth.Handler`.

---

## Task 1: Database migrations

**Files:**
- Create: `db/migrations/20260613190000_create_access_tables.up.sql`
- Create: `db/migrations/20260613190000_create_access_tables.down.sql`
- Create: `db/migrations/20260613190100_backfill_user_access_active.up.sql`
- Create: `db/migrations/20260613190100_backfill_user_access_active.down.sql`

> Existing migrations are timestamp-named (`YYYYMMDDHHMMSS_name.up.sql`). Match that — create the files by hand, do **not** use `make db:migrate:create` (it uses `-seq`).

- [ ] **Step 1: Write `create_access_tables.up.sql`**

```sql
CREATE TYPE access_status AS ENUM ('waitlisted', 'active');
CREATE TYPE signup_code_status AS ENUM ('available', 'consumed');

CREATE TABLE IF NOT EXISTS user_access (
    user_id       TEXT PRIMARY KEY,
    status        access_status NOT NULL DEFAULT 'waitlisted',
    activated_at  TIMESTAMP WITH TIME ZONE,
    activated_via TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signup_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                TEXT NOT NULL UNIQUE,
    owner_user_id       TEXT NOT NULL,
    status              signup_code_status NOT NULL DEFAULT 'available',
    redeemed_by_user_id TEXT,
    consumed_at         TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_codes_owner ON signup_codes (owner_user_id);
```

- [ ] **Step 2: Write `create_access_tables.down.sql`**

```sql
DROP TABLE IF EXISTS signup_codes;
DROP TABLE IF EXISTS user_access;
DROP TYPE IF EXISTS signup_code_status;
DROP TYPE IF EXISTS access_status;
```

- [ ] **Step 3: Write `backfill_user_access_active.up.sql`**

Grandfather every user who already exists (identified by a `user_preferences` row) so the gate only affects genuinely new signups.

```sql
INSERT INTO user_access (user_id, status, activated_at, activated_via)
SELECT user_id, 'active', NOW(), 'grandfathered'
FROM user_preferences
ON CONFLICT (user_id) DO NOTHING;
```

- [ ] **Step 4: Write `backfill_user_access_active.down.sql`**

```sql
DELETE FROM user_access WHERE activated_via = 'grandfathered';
```

- [ ] **Step 5: Apply migrations to the local dev DB**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make db:migrate:up'`
Expected: `... 20260613190100_backfill_user_access_active (… )` applied, no error.

> ⚠️ The local dev DB on port 5434 is shared across worktrees. If another session's migrations collide, revert with this worktree's `make db:migrate:down` (one step at a time) and re-apply. Prefer setting a dedicated `ZETA_DB_PORT` if available.

- [ ] **Step 6: Commit**

```bash
git add db/migrations/20260613190000_create_access_tables.up.sql \
        db/migrations/20260613190000_create_access_tables.down.sql \
        db/migrations/20260613190100_backfill_user_access_active.up.sql \
        db/migrations/20260613190100_backfill_user_access_active.down.sql
git commit -m "feat(db): add user_access and signup_codes tables with grandfather backfill"
```

---

## Task 2: sqlc queries + regenerate

**Files:**
- Create: `db/queries/access.sql`
- Regenerate: `internal/db/*`, `internal/db/mocks/mock_querier.go`

- [ ] **Step 1: Write `db/queries/access.sql`**

```sql
-- name: EnsureUserAccess :one
INSERT INTO user_access (user_id)
VALUES ($1)
ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
RETURNING *;

-- name: GetUserAccess :one
SELECT * FROM user_access WHERE user_id = $1;

-- name: ActivateUserAccess :one
UPDATE user_access
SET status = 'active', activated_at = NOW(), activated_via = @activated_via
WHERE user_id = @user_id
RETURNING *;

-- name: CreateSignupCode :one
INSERT INTO signup_codes (code, owner_user_id)
VALUES ($1, $2)
RETURNING *;

-- name: ListSignupCodesByOwner :many
SELECT * FROM signup_codes WHERE owner_user_id = $1 ORDER BY created_at ASC;

-- name: CountSignupCodesByOwner :one
SELECT COUNT(*) FROM signup_codes WHERE owner_user_id = $1;

-- name: ConsumeSignupCode :one
UPDATE signup_codes
SET status = 'consumed', redeemed_by_user_id = @redeemed_by_user_id, consumed_at = NOW()
WHERE code = @code AND status = 'available'
RETURNING *;

-- name: ReleaseSignupCode :exec
UPDATE signup_codes
SET status = 'available', redeemed_by_user_id = NULL, consumed_at = NULL
WHERE id = @id;
```

> `ConsumeSignupCode`'s `WHERE … AND status = 'available'` is the atomic single-flight guard: exactly one concurrent redeemer of a shared bearer code wins (gets a row back); the others get `pgx.ErrNoRows`.

- [ ] **Step 2: Generate the db package**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make db:sqlc'`
Expected: regenerates `internal/db/access.sql.go`, `models.go` (adds `UserAccess`, `SignupCode`, `AccessStatus`, `SignupCodeStatus`), `querier.go`. No error.

- [ ] **Step 3: Regenerate mocks**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make mocks'`
Expected: `internal/db/mocks/mock_querier.go` gains the new methods. No error.

- [ ] **Step 4: Verify it builds**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make api:build'`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add db/queries/access.sql internal/db/
git commit -m "feat(db): add access + signup_codes sqlc queries and regenerate"
```

---

## Task 3: Extend WorkOS interface with role updates

**Files:**
- Modify: `internal/auth/workos.go`
- Regenerate: `internal/auth/mocks/mock_workos.go`

- [ ] **Step 1: Add the method to the `UserManagement` interface**

In `internal/auth/workos.go`, inside `type UserManagement interface { … }`, add:

```go
	UpdateOrganizationMembership(ctx context.Context, organizationMembershipID string, opts usermanagement.UpdateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error)
```

- [ ] **Step 2: Add the wrapper implementation**

At the end of `internal/auth/workos.go`, add:

```go
func (w *workosClient) UpdateOrganizationMembership(ctx context.Context, organizationMembershipID string, opts usermanagement.UpdateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error) {
	return usermanagement.UpdateOrganizationMembership(ctx, organizationMembershipID, opts)
}
```

- [ ] **Step 3: Regenerate the WorkOS mock**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make mocks'`
Expected: `internal/auth/mocks/mock_workos.go` gains `UpdateOrganizationMembership`.

- [ ] **Step 4: Verify build**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make api:build'`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add internal/auth/workos.go internal/auth/mocks/mock_workos.go
git commit -m "feat(auth): add UpdateOrganizationMembership to WorkOS interface"
```

---

## Task 4: Exported session-refresh helper on auth.Handler

The redeem handler (in `internal/access`) must re-issue session cookies after a role upgrade so the new role takes effect without a manual re-login. Expose the existing private machinery via one exported method.

**Files:**
- Modify: `internal/auth/handler.go`
- Test: `internal/auth/handler_test.go`

- [ ] **Step 1: Write the failing test**

Add to `internal/auth/handler_test.go`:

```go
func TestRefreshSessionCookiesReissuesCookies(t *testing.T) {
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("DEFAULT_ORG_ID", "org_123")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().AuthenticateWithRefreshToken(gomock.Any(), gomock.Any()).Return(
		usermanagement.RefreshAuthenticationResponse{AccessToken: "new_access", RefreshToken: "new_refresh"}, nil,
	)

	h := NewHandler(slog.Default(), nil, workos)
	req := httptest.NewRequest(http.MethodPost, "/access/redeem", nil)
	req.AddCookie(&http.Cookie{Name: RefreshCookieName, Value: "old_refresh"})
	rec := httptest.NewRecorder()

	if err := h.RefreshSessionCookies(req.Context(), rec, req); err != nil {
		t.Fatalf("RefreshSessionCookies returned error: %v", err)
	}

	var gotAccess string
	for _, c := range rec.Result().Cookies() {
		if c.Name == CookieName {
			gotAccess = c.Value
		}
	}
	if gotAccess != "new_access" {
		t.Fatalf("session cookie = %q, want %q", gotAccess, "new_access")
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/auth/ -run TestRefreshSessionCookies -v'`
Expected: FAIL — `h.RefreshSessionCookies undefined`.

- [ ] **Step 3: Implement the helper**

Add to `internal/auth/handler.go` (near `refreshSessionForDefaultOrg`):

```go
// RefreshSessionCookies re-mints the session for the default org from the request's
// refresh-token cookie and writes fresh session cookies. Used after a role change so
// the new role/permissions take effect without a manual re-login.
func (h *Handler) RefreshSessionCookies(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	refreshCookie, err := r.Cookie(RefreshCookieName)
	if err != nil || refreshCookie.Value == "" {
		return fmt.Errorf("no refresh token cookie")
	}
	resp, err := h.refreshSessionForDefaultOrg(ctx, refreshCookie.Value)
	if err != nil {
		return err
	}
	setSessionCookies(w, resp.AccessToken, resp.RefreshToken, true)
	return nil
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/auth/ -run TestRefreshSessionCookies -v'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/auth/handler.go internal/auth/handler_test.go
git commit -m "feat(auth): export RefreshSessionCookies for post-role-change refresh"
```

---

## Task 5: Surface `access_status` in `/auth/me`

Lazily ensure a `user_access` row exists (defaults to `waitlisted`) and include the status in the response so clients can route waitlisted users to the code screen.

**Files:**
- Modify: `internal/auth/handler.go` (the `Me` handler, response map around line 675)
- Test: `internal/auth/handler_test.go`

- [ ] **Step 1: Add the access ensure + response field**

In `Me`, immediately before `resp := map[string]interface{}{ … }` (currently ~line 674), add:

```go
	accessStatus := string(db.AccessStatusWaitlisted)
	if acc, accErr := h.q.EnsureUserAccess(ctx, user.ID); accErr != nil {
		h.logger.ErrorContext(ctx, "auth_ensure_access_failed",
			slog.String("component", "auth"),
			slog.String("user_id", user.ID),
			slog.Any("err", accErr),
		)
	} else {
		accessStatus = string(acc.Status)
	}
```

Then add to the `resp` map:

```go
		"access_status": accessStatus,
```

> `db.AccessStatusWaitlisted` is the sqlc-generated enum constant from Task 2. Verify its exact name in `internal/db/models.go` (sqlc emits `AccessStatusWaitlisted` / `AccessStatusActive`).

- [ ] **Step 2: Write the failing test**

Add to `internal/auth/handler_test.go`. This requires a mocked Querier; follow the pattern in `internal/users/handler_test.go` (`dbmocks.NewMockQuerier`). Build a JWT with a role set so `Me` skips the WorkOS path:

```go
func TestMeIncludesAccessStatus(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)

	q.EXPECT().EnsureUserAccess(gomock.Any(), "user_123").Return(
		db.UserAccess{UserID: "user_123", Status: db.AccessStatusActive}, nil,
	)
	q.EXPECT().GetUserPreferences(gomock.Any(), "user_123").Return(
		db.UserPreference{UserID: "user_123", Language: db.LanguageCodeEn, Timezone: "UTC"}, nil,
	)

	h := NewHandler(slog.Default(), q, workos)
	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req = req.WithContext(withUser(req.Context(), &UserContext{ID: "user_123", Role: "student", Permissions: []string{}}))
	rec := httptest.NewRecorder()

	h.Me(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body["access_status"] != "active" {
		t.Fatalf("access_status = %v, want active", body["access_status"])
	}
}
```

> Check the exact helper to inject a `*UserContext` into the request context (the middleware uses a context key). Find it with `grep -n "func GetUser\|context.WithValue\|userContextKey" internal/auth/middleware.go` and use the matching setter (e.g. a test helper or `context.WithValue(ctx, userContextKey, u)`). If no exported setter exists, add a small test-only helper in the test file using the same key. Also confirm the exact `db.UserPreference` field names and `db.LanguageCodeEn` constant from `internal/db/models.go`.

- [ ] **Step 3: Run it to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/auth/ -run TestMeIncludesAccessStatus -v'`
Expected: FAIL (compile error: `EnsureUserAccess` not expected / field missing) before the implementation, PASS after.

- [ ] **Step 4: Run all auth tests**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/auth/ -v'`
Expected: PASS. (If pre-existing `Me` tests now fail because they don't mock `EnsureUserAccess`, add `q.EXPECT().EnsureUserAccess(...)` to them.)

- [ ] **Step 5: Commit**

```bash
git add internal/auth/handler.go internal/auth/handler_test.go
git commit -m "feat(auth): surface access_status in /auth/me and lazily ensure access row"
```

---

## Task 6: `internal/access` — code generation + allotment

**Files:**
- Create: `internal/access/codes.go`

- [ ] **Step 1: Write `codes.go`**

```go
package access

import (
	"crypto/rand"
	"math/big"
)

// ExpertCodeAllotment is the fixed number of signup codes an expert receives.
const ExpertCodeAllotment = 5

// signupCodeLength is the character length of a generated signup code.
const signupCodeLength = 8

const codeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// generateCode returns a cryptographically random code of the given length.
func generateCode(length int) (string, error) {
	b := make([]byte, length)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if err != nil {
			return "", err
		}
		b[i] = codeAlphabet[idx.Int64()]
	}
	return string(b), nil
}
```

> This mirrors `internal/invitations/handler.go:generateCode` (which is unexported there). Minor, accepted duplication — extracting a shared helper would require touching `invitations`, which is out of scope.

- [ ] **Step 2: Commit**

```bash
git add internal/access/codes.go
git commit -m "feat(access): add signup-code generation and allotment constants"
```

---

## Task 7: `internal/access` — Handler scaffold + Redeem (expert path)

**Files:**
- Create: `internal/access/handler.go`
- Create: `internal/access/handler_test.go`

- [ ] **Step 1: Write the Handler scaffold + SessionRefresher**

Create `internal/access/handler.go`:

```go
package access

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/jackc/pgx/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// SessionRefresher re-issues session cookies after a role change. Satisfied by *auth.Handler.
type SessionRefresher interface {
	RefreshSessionCookies(ctx context.Context, w http.ResponseWriter, r *http.Request) error
}

type Handler struct {
	q         db.Querier
	workos    auth.UserManagement
	refresher SessionRefresher
	logger    *slog.Logger
}

func NewHandler(q db.Querier, workos auth.UserManagement, refresher SessionRefresher, logger *slog.Logger) *Handler {
	return &Handler{q: q, workos: workos, refresher: refresher, logger: logger}
}

// upgradeToExpert changes the user's default-org membership role to expert.
func (h *Handler) upgradeToExpert(ctx context.Context, userID string) error {
	orgID := os.Getenv("DEFAULT_ORG_ID")
	if orgID == "" {
		return errors.New("DEFAULT_ORG_ID is not configured")
	}
	memberships, err := h.workos.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		OrganizationID: orgID,
		UserID:         userID,
	})
	if err != nil {
		return err
	}
	if len(memberships.Data) == 0 {
		return errors.New("user has no default-org membership")
	}
	_, err = h.workos.UpdateOrganizationMembership(ctx, memberships.Data[0].ID, usermanagement.UpdateOrganizationMembershipOpts{
		RoleSlug: permissions.RoleExpert,
	})
	return err
}
```

- [ ] **Step 2: Write the Redeem handler**

Append to `internal/access/handler.go`:

```go
type redeemRequest struct {
	Code string `json:"code"`
}

// Redeem activates the calling (authenticated) user via an invite code.
// Expert signup codes upgrade the user to expert; group-invite codes join the
// group and activate as student.
func (h *Handler) Redeem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req redeemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	code := strings.TrimSpace(req.Code)
	if code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	// Idempotent: an already-active user does not consume a fresh code.
	if acc, err := h.q.GetUserAccess(ctx, user.ID); err == nil && acc.Status == db.AccessStatusActive {
		writeRedeemResponse(w, db.AccessStatusActive, user.Role, false)
		return
	} else if err != nil && err != pgx.ErrNoRows {
		log.ErrorContext(ctx, "access_redeem_get_access_failed",
			slog.String("component", "access"), slog.String("user_id", user.ID), slog.Any("err", err))
		http.Error(w, "Failed to read access state", http.StatusInternalServerError)
		return
	}

	// 1. Expert signup code (atomic single-flight consume).
	signup, err := h.q.ConsumeSignupCode(ctx, db.ConsumeSignupCodeParams{
		Code:             code,
		RedeemedByUserID: pgtypeText(user.ID),
	})
	if err == nil {
		if upErr := h.upgradeToExpert(ctx, user.ID); upErr != nil {
			// Compensate: release the code so it is not lost.
			if relErr := h.q.ReleaseSignupCode(ctx, signup.ID); relErr != nil {
				log.ErrorContext(ctx, "access_redeem_release_failed",
					slog.String("component", "access"), slog.Any("err", relErr))
			}
			log.ErrorContext(ctx, "access_redeem_expert_upgrade_failed",
				slog.String("component", "access"), slog.String("user_id", user.ID), slog.Any("err", upErr))
			http.Error(w, "Failed to activate account", http.StatusInternalServerError)
			return
		}
		h.activateAndRespond(w, r, user.ID, "expert_code", permissions.RoleExpert, true)
		return
	}
	if err != pgx.ErrNoRows {
		log.ErrorContext(ctx, "access_redeem_consume_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to redeem code", http.StatusInternalServerError)
		return
	}

	// 2. Group-invite code (student path). Implemented in Task 8.
	if h.tryGroupRedeem(ctx, w, r, user, code) {
		return
	}

	// 3. Neutral error — no enumeration oracle.
	log.WarnContext(ctx, "access_redeem_invalid_code",
		slog.String("component", "access"), slog.String("user_id", user.ID))
	http.Error(w, "Invalid or already used code", http.StatusBadRequest)
}

// activateAndRespond flips the user to active, refreshes cookies (best-effort), and responds.
func (h *Handler) activateAndRespond(w http.ResponseWriter, r *http.Request, userID, via, role string, roleUpgraded bool) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	if _, err := h.q.ActivateUserAccess(ctx, db.ActivateUserAccessParams{
		UserID:       userID,
		ActivatedVia: pgtypeText(via),
	}); err != nil {
		log.ErrorContext(ctx, "access_activate_failed",
			slog.String("component", "access"), slog.String("user_id", userID), slog.Any("err", err))
		http.Error(w, "Failed to activate account", http.StatusInternalServerError)
		return
	}
	if roleUpgraded {
		if err := h.refresher.RefreshSessionCookies(ctx, w, r); err != nil {
			// Non-fatal: the client can re-login to pick up the new role.
			log.WarnContext(ctx, "access_session_refresh_failed",
				slog.String("component", "access"), slog.Any("err", err))
		}
	}
	log.InfoContext(ctx, "access_redeemed",
		slog.String("component", "access"), slog.String("user_id", userID), slog.String("via", via))
	writeRedeemResponse(w, db.AccessStatusActive, role, roleUpgraded)
}

func writeRedeemResponse(w http.ResponseWriter, status db.AccessStatus, role string, roleUpgraded bool) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"access_status": string(status),
		"role":          role,
		"role_upgraded": roleUpgraded,
	})
}

func pgtypeText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}
```

> Add the `github.com/jackc/pgx/v5/pgtype` import. Verify the generated param struct field names (`db.ConsumeSignupCodeParams{Code, RedeemedByUserID}`, `db.ActivateUserAccessParams{UserID, ActivatedVia}`) against `internal/db/access.sql.go` — sqlc names `@param` args in PascalCase. Adjust if they differ.

- [ ] **Step 3: Write the failing expert-path test**

Create `internal/access/handler_test.go`:

```go
package access

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	authmocks "github.com/OZIOisgood/zeta/internal/auth/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/jackc/pgx/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"go.uber.org/mock/gomock"
)

type fakeRefresher struct{ called bool }

func (f *fakeRefresher) RefreshSessionCookies(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	f.called = true
	return nil
}

func redeemRequestFor(t *testing.T, userID, role, code string) *http.Request {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"code": code})
	req := httptest.NewRequest(http.MethodPost, "/access/redeem", bytes.NewReader(body))
	// Inject the authenticated user. Use the same context key auth.GetUser reads.
	return req.WithContext(auth.WithUser(req.Context(), &auth.UserContext{ID: userID, Role: role, Permissions: []string{}}))
}

func TestRedeemExpertCodeUpgradesRole(t *testing.T) {
	t.Setenv("DEFAULT_ORG_ID", "org_123")
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)
	ref := &fakeRefresher{}

	q.EXPECT().GetUserAccess(gomock.Any(), "user_new").Return(db.UserAccess{UserID: "user_new", Status: db.AccessStatusWaitlisted}, nil)
	q.EXPECT().ConsumeSignupCode(gomock.Any(), gomock.Any()).Return(db.SignupCode{Code: "EXPERT01"}, nil)
	workos.EXPECT().ListOrganizationMemberships(gomock.Any(), gomock.Any()).Return(
		usermanagement.ListOrganizationMembershipsResponse{Data: []usermanagement.OrganizationMembership{{ID: "om_1"}}}, nil)
	workos.EXPECT().UpdateOrganizationMembership(gomock.Any(), "om_1", usermanagement.UpdateOrganizationMembershipOpts{RoleSlug: permissions.RoleExpert}).Return(usermanagement.OrganizationMembership{}, nil)
	q.EXPECT().ActivateUserAccess(gomock.Any(), gomock.Any()).Return(db.UserAccess{Status: db.AccessStatusActive}, nil)

	h := NewHandler(q, workos, ref, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor(t, "user_new", permissions.RoleStudent, "EXPERT01"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body map[string]any
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["role"] != "expert" || body["role_upgraded"] != true {
		t.Fatalf("body = %v, want expert/role_upgraded", body)
	}
	if !ref.called {
		t.Fatal("expected session refresh after role upgrade")
	}
}
```

> `auth.WithUser` and `auth.UserContext` must be reachable. If `auth` has no exported `WithUser`, add one in `internal/auth/middleware.go` (`func WithUser(ctx context.Context, u *UserContext) context.Context`) using the existing context key — confirm the key name first. Add `"context"` import to the test.

- [ ] **Step 4: Run it to verify it fails, then passes after Task 8 compiles**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/access/ -run TestRedeemExpertCode -v'`
Expected: FAIL until `tryGroupRedeem` (Task 8) exists so the package compiles. (It is fine for Task 7 and 8 to land in one commit if the package will not compile in between.)

- [ ] **Step 5: Commit (after Task 8 makes the package compile)**

> Defer the commit to Task 8, Step 5 — the package needs `tryGroupRedeem` to build.

---

## Task 8: Redeem — group/student path, invalid, double-spend, idempotent

**Files:**
- Modify: `internal/access/handler.go`
- Modify: `internal/access/handler_test.go`

- [ ] **Step 1: Implement `tryGroupRedeem`**

Append to `internal/access/handler.go`:

```go
// tryGroupRedeem handles the student path: a valid group-invite code joins the
// caller to the group and activates them as a student. Returns true if it handled
// the request (success or error response written).
func (h *Handler) tryGroupRedeem(ctx context.Context, w http.ResponseWriter, r *http.Request, user *auth.UserContext, code string) bool {
	log := logger.From(ctx, h.logger)
	inv, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil {
		return false // not a group code — let the caller emit the neutral error
	}

	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{UserID: user.ID, GroupID: inv.GroupID})
	if err != nil {
		log.ErrorContext(ctx, "access_redeem_membership_check_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return true
	}
	if !isMember {
		if err := h.q.AddUserToGroup(ctx, db.AddUserToGroupParams{UserID: user.ID, GroupID: inv.GroupID}); err != nil {
			log.ErrorContext(ctx, "access_redeem_add_to_group_failed",
				slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to join group", http.StatusInternalServerError)
			return true
		}
	}
	// Group-invite codes stay multi-use (matching existing AcceptInvitation behavior);
	// they are not consumed here. Role stays student (the default).
	h.activateAndRespond(w, r, user.ID, "group_code", user.Role, false)
	return true
}
```

> Confirm `db.CheckUserGroupParams` and `db.AddUserToGroupParams` field names against `internal/db` (they are used in `internal/invitations/handler.go`, so they exist). `inv.GroupID` is a `pgtype.UUID`.

- [ ] **Step 2: Add the remaining tests**

Append to `internal/access/handler_test.go`:

```go
func TestRedeemGroupCodeActivatesStudent(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	workos := authmocks.NewMockUserManagement(ctrl)

	q.EXPECT().GetUserAccess(gomock.Any(), "user_s").Return(db.UserAccess{Status: db.AccessStatusWaitlisted}, nil)
	q.EXPECT().ConsumeSignupCode(gomock.Any(), gomock.Any()).Return(db.SignupCode{}, pgx.ErrNoRows)
	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "GRP123").Return(db.GroupInvitation{}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), gomock.Any()).Return(false, nil)
	q.EXPECT().AddUserToGroup(gomock.Any(), gomock.Any()).Return(nil)
	q.EXPECT().ActivateUserAccess(gomock.Any(), gomock.Any()).Return(db.UserAccess{Status: db.AccessStatusActive}, nil)

	h := NewHandler(q, workos, &fakeRefresher{}, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor(t, "user_s", permissions.RoleStudent, "GRP123"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body map[string]any
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["role"] != "student" || body["role_upgraded"] != false {
		t.Fatalf("body = %v, want student/no-upgrade", body)
	}
}

func TestRedeemInvalidCodeReturnsNeutralError(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)

	q.EXPECT().GetUserAccess(gomock.Any(), "user_x").Return(db.UserAccess{Status: db.AccessStatusWaitlisted}, nil)
	q.EXPECT().ConsumeSignupCode(gomock.Any(), gomock.Any()).Return(db.SignupCode{}, pgx.ErrNoRows)
	q.EXPECT().GetGroupInvitationByCode(gomock.Any(), "NOPE").Return(db.GroupInvitation{}, pgx.ErrNoRows)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor(t, "user_x", permissions.RoleStudent, "NOPE"))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestRedeemAlreadyActiveIsNoOp(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().GetUserAccess(gomock.Any(), "user_a").Return(db.UserAccess{Status: db.AccessStatusActive}, nil)
	// No ConsumeSignupCode / Activate expectations — must not be called.

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	rec := httptest.NewRecorder()
	h.Redeem(rec, redeemRequestFor(t, "user_a", permissions.RoleExpert, "EXPERT01"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}
```

> `TestRedeemAlreadyActiveIsNoOp` covers the double-spend-prevention surface at the handler level (an active user cannot burn a code). The DB-level single-flight (`ConsumeSignupCode` conditional UPDATE) is covered by an integration test if/when a real-DB suite is added — note it as a follow-up rather than mocking the race here.

- [ ] **Step 3: Run all access tests**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/access/ -v'`
Expected: PASS (all four redeem tests).

- [ ] **Step 4: Run the full build**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make api:build'`
Expected: success.

- [ ] **Step 5: Commit (Tasks 7 + 8 together)**

```bash
git add internal/access/handler.go internal/access/handler_test.go internal/auth/middleware.go
git commit -m "feat(access): add redeem endpoint (expert upgrade + student group join)"
```

---

## Task 9: List + generate signup codes

**Files:**
- Modify: `internal/access/handler.go`
- Modify: `internal/access/handler_test.go`

- [ ] **Step 1: Implement ListCodes (expert lazy-5) and GenerateCodes (admin unlimited)**

Append to `internal/access/handler.go`:

```go
type signupCodeView struct {
	Code   string `json:"code"`
	Status string `json:"status"`
}

// ListCodes returns the caller's signup codes. Experts get a lazily-created
// allotment of ExpertCodeAllotment on first call.
func (h *Handler) ListCodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Role != permissions.RoleExpert && user.Role != permissions.RoleAdmin {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	if user.Role == permissions.RoleExpert {
		count, err := h.q.CountSignupCodesByOwner(ctx, user.ID)
		if err != nil {
			log.ErrorContext(ctx, "access_codes_count_failed", slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to load codes", http.StatusInternalServerError)
			return
		}
		for i := count; i < ExpertCodeAllotment; i++ {
			if err := h.mintCode(ctx, user.ID); err != nil {
				log.ErrorContext(ctx, "access_codes_seed_failed", slog.String("component", "access"), slog.Any("err", err))
				http.Error(w, "Failed to create codes", http.StatusInternalServerError)
				return
			}
		}
	}

	codes, err := h.q.ListSignupCodesByOwner(ctx, user.ID)
	if err != nil {
		log.ErrorContext(ctx, "access_codes_list_failed", slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to load codes", http.StatusInternalServerError)
		return
	}
	views := make([]signupCodeView, 0, len(codes))
	for _, c := range codes {
		views = append(views, signupCodeView{Code: c.Code, Status: string(c.Status)})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"codes": views})
}

// GenerateCodes mints additional expert codes. Admin only, no cap.
func (h *Handler) GenerateCodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Role != permissions.RoleAdmin {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}
	var req struct {
		Count int `json:"count"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Count < 1 || req.Count > 100 {
		http.Error(w, "Invalid count (1-100)", http.StatusBadRequest)
		return
	}
	for i := 0; i < req.Count; i++ {
		if err := h.mintCode(ctx, user.ID); err != nil {
			log.ErrorContext(ctx, "access_codes_generate_failed", slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to generate codes", http.StatusInternalServerError)
			return
		}
	}
	log.InfoContext(ctx, "access_codes_generated",
		slog.String("component", "access"), slog.String("user_id", user.ID), slog.Int("count", req.Count))
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) mintCode(ctx context.Context, ownerID string) error {
	code, err := generateCode(signupCodeLength)
	if err != nil {
		return err
	}
	_, err = h.q.CreateSignupCode(ctx, db.CreateSignupCodeParams{Code: code, OwnerUserID: ownerID})
	return err
}
```

> Confirm `db.CreateSignupCodeParams` field names (`Code`, `OwnerUserID`) against `internal/db/access.sql.go`.

- [ ] **Step 2: Add tests**

Append to `internal/access/handler_test.go`:

```go
func TestListCodesLazilySeedsFiveForExpert(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().CountSignupCodesByOwner(gomock.Any(), "exp_1").Return(int64(0), nil)
	q.EXPECT().CreateSignupCode(gomock.Any(), gomock.Any()).Times(ExpertCodeAllotment).Return(db.SignupCode{}, nil)
	q.EXPECT().ListSignupCodesByOwner(gomock.Any(), "exp_1").Return([]db.SignupCode{
		{Code: "AAAA1111", Status: db.SignupCodeStatusAvailable},
	}, nil)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	req := httptest.NewRequest(http.MethodGet, "/access/codes", nil).
		WithContext(auth.WithUser(context.Background(), &auth.UserContext{ID: "exp_1", Role: permissions.RoleExpert}))
	rec := httptest.NewRecorder()
	h.ListCodes(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}

func TestGenerateCodesRequiresAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())

	body := bytes.NewReader([]byte(`{"count":3}`))
	req := httptest.NewRequest(http.MethodPost, "/access/codes", body).
		WithContext(auth.WithUser(context.Background(), &auth.UserContext{ID: "exp_1", Role: permissions.RoleExpert}))
	rec := httptest.NewRecorder()
	h.GenerateCodes(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}
```

> Confirm `db.SignupCodeStatusAvailable` constant name from `internal/db/models.go`.

- [ ] **Step 3: Run access tests**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/access/ -v'`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add internal/access/handler.go internal/access/handler_test.go
git commit -m "feat(access): list (expert lazy-5) and generate (admin) signup codes"
```

---

## Task 10: `RequireActiveAccess` middleware

Gate the existing protected feature routes server-side. Waitlisted users get 403; admins always pass.

**Files:**
- Modify: `internal/access/handler.go`
- Modify: `internal/access/handler_test.go`

- [ ] **Step 1: Implement the middleware**

Append to `internal/access/handler.go`:

```go
// RequireActiveAccess blocks waitlisted users from protected feature routes.
// Admins always pass. Apply to the feature-route group, NOT to /access/redeem.
func (h *Handler) RequireActiveAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := auth.GetUser(ctx)
		if user == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		if user.Role == permissions.RoleAdmin {
			next.ServeHTTP(w, r)
			return
		}
		acc, err := h.q.GetUserAccess(ctx, user.ID)
		if err != nil || acc.Status != db.AccessStatusActive {
			if err != nil && err != pgx.ErrNoRows {
				logger.From(ctx, h.logger).ErrorContext(ctx, "access_gate_lookup_failed",
					slog.String("component", "access"), slog.Any("err", err))
			}
			http.Error(w, "Account not yet activated", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 2: Add tests**

Append to `internal/access/handler_test.go`:

```go
func TestRequireActiveAccessBlocksWaitlisted(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().GetUserAccess(gomock.Any(), "wl_1").Return(db.UserAccess{Status: db.AccessStatusWaitlisted}, nil)

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	req := httptest.NewRequest(http.MethodGet, "/groups", nil).
		WithContext(auth.WithUser(context.Background(), &auth.UserContext{ID: "wl_1", Role: permissions.RoleStudent}))
	rec := httptest.NewRecorder()
	h.RequireActiveAccess(next).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestRequireActiveAccessAllowsActiveAndAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().GetUserAccess(gomock.Any(), "act_1").Return(db.UserAccess{Status: db.AccessStatusActive}, nil)
	// Admin path makes no DB call.

	h := NewHandler(q, authmocks.NewMockUserManagement(ctrl), &fakeRefresher{}, slog.Default())
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	for _, tc := range []struct{ id, role string }{{"act_1", permissions.RoleStudent}, {"adm_1", permissions.RoleAdmin}} {
		req := httptest.NewRequest(http.MethodGet, "/groups", nil).
			WithContext(auth.WithUser(context.Background(), &auth.UserContext{ID: tc.id, Role: tc.role}))
		rec := httptest.NewRecorder()
		h.RequireActiveAccess(next).ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("role %s: status = %d, want 200", tc.role, rec.Code)
		}
	}
}
```

- [ ] **Step 3: Run access tests**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && go test ./internal/access/ -v'`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add internal/access/handler.go internal/access/handler_test.go
git commit -m "feat(access): add RequireActiveAccess gate middleware"
```

---

## Task 11: Wire the access handler into the router

**Files:**
- Modify: `internal/api/server.go`

- [ ] **Step 1: Construct the access handler**

In `server.go`, after `authHandler := auth.NewHandler(...)` (line 81) and the other handler constructions, add:

```go
	accessHandler := access.NewHandler(queries, workosClient, authHandler, s.Logger)
```

Add the import `"github.com/OZIOisgood/zeta/internal/access"`.

- [ ] **Step 2: Restructure the protected route group**

In the `// Protected Routes` group (currently lines 168–195), add the redeem endpoint at the top (reachable while waitlisted) and wrap the existing feature routes in an inner group guarded by `RequireActiveAccess`:

```go
	// Protected Routes
	s.Router.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth)

		// Reachable while waitlisted: redeem an invite code to activate.
		r.Post("/access/redeem", accessHandler.Redeem)

		// Everything else requires an activated account.
		r.Group(func(r chi.Router) {
			r.Use(accessHandler.RequireActiveAccess)

			r.Get("/access/codes", accessHandler.ListCodes)
			r.Post("/access/codes", accessHandler.GenerateCodes)

			r.Route("/assets", assetsHandler.RegisterRoutes)
			r.Route("/assets/videos", reviewsHandler.RegisterRoutes)
			r.Route("/reviews", func(r chi.Router) {
				r.Post("/enhance", reviewsHandler.EnhanceText)
			})
			r.Route("/groups", func(r chi.Router) {
				// … existing group routes unchanged …
			})
			r.Route("/notifications", notificationsHandler.RegisterRoutes)
			reportsHandler.RegisterRoutes(r)
			coachingHandler.RegisterRoutes(r)
		})
	})
```

> Move the existing `/assets`, `/groups`, `/notifications`, reports, and coaching registrations verbatim into the inner `RequireActiveAccess` group. `/auth/me` stays in the separate Auth Routes group (unchanged) so waitlisted users can still read their status.

- [ ] **Step 2b: Verify build**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make api:build'`
Expected: success.

- [ ] **Step 3: Run the full unit suite**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && make test:unit'`
Expected: all packages PASS.

- [ ] **Step 4: Commit**

```bash
git add internal/api/server.go
git commit -m "feat(api): wire access redeem/codes routes and gate feature routes"
```

---

## Task 12: Docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Add `user_access` and `signup_codes` to the database tables section, and add a short note to the user-journey / auth-flow description: registration is open; new users are `waitlisted` until they redeem an invite code (expert codes upgrade to expert; group-invite codes activate as student); existing users were grandfathered to `active`. No new env vars are introduced (DEFAULT_ORG_ID / WORKOS_* already exist), so `.env.example` and Terraform are unchanged.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document access gate (user_access, signup_codes, waitlist flow)"
```

---

## Final verification

- [ ] `make api:build` succeeds.
- [ ] `make test:unit` passes (auth + access + existing packages).
- [ ] `make db:migrate:up` then `make db:migrate:down` (x2) cleanly apply/revert the new migrations.
- [ ] Manual smoke (optional, needs WorkOS dev): a fresh login returns `access_status: "waitlisted"` from `/auth/me`; `GET /groups` returns 403; `POST /access/redeem` with a seeded expert code returns `role_upgraded: true` and subsequently `/groups` returns 200.

## Self-review notes (gaps surfaced while writing)

- **Spec coverage:** waitlist hard lock-out (Task 10), expert bearer codes 5/expert (Tasks 6/9), admin unlimited (Task 9), student group reuse (Task 8), grandfathering (Task 1), live role refresh (Tasks 4/7), `access_status` exposure (Task 5) — all mapped.
- **Out of this plan (separate plans):** Web `/welcome` + codes page (Plan 2), mobile redeem (Plan 3 / PR #15). The web/mobile clients depend only on `/auth/me.access_status`, `POST /access/redeem`, `GET/POST /access/codes` — all delivered here.
- **Verify-before-use:** sqlc generates exact Go identifiers; every task that references a generated type/param flags "confirm name against `internal/db`". Likewise `auth.WithUser`/`UserContext` and the context-key may need a small exported test helper in `auth` (Task 7 note).
