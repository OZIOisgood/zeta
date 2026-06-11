# Training Plans v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Experts (group owners) create training plans (title + description + ordered steps); riders see them in the group and upload videos linked to a plan. Review flow unchanged.

**Architecture:** New `training_plans` table + `internal/trainingplans` Go package following the `internal/groups` handler pattern; nullable `training_plan_id` on `assets`; Angular pages/store/API-client following the existing dashboard-next conventions (signal store, `z-*` UI library, Transloco).

**Tech Stack:** Go + chi + sqlc + pgx/v5 + gomock; Angular 21 + NgRx Signal Store + Tailwind + ng-primitives + Transloco.

**Spec:** `.agents/plans/20260611230030_training_plans_v1_design.md`

**Conventions that apply to every task:**
- Run all commands from the repo root. On a Windows host, wrap them: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && <command>"`.
- Commit messages: Conventional Commits, **no** `Co-Authored-By` trailer. Stage only the files you touched (`git add <paths>`), never `git add -A`.
- One deliberate deviation from the spec: for "plan not visible" we return **403 Permission denied** (matching `GetGroupByID` in `internal/groups/handler.go`), not 404. The spec's "404-Verhalten" meant "behave like the existing permission-denied path" — in this codebase that path is 403.

---

### Task 1: DB migration, sqlc queries, regenerate code

**Files:**
- Create: `db/migrations/20260612000000_create_training_plans.up.sql`
- Create: `db/migrations/20260612000000_create_training_plans.down.sql`
- Create: `db/queries/training_plans.sql`
- Modify: `db/queries/assets.sql` (CreateAsset, ListVisibleAssets, GetVisibleAsset)
- Generated: `internal/db/*` via sqlc, `internal/db/mocks/mock_querier.go` via mockgen

- [ ] **Step 1: Write the up migration**

`db/migrations/20260612000000_create_training_plans.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS training_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    owner_id    TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    steps       TEXT[] NOT NULL DEFAULT '{}',
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_training_plans_group_id ON training_plans(group_id);

ALTER TABLE assets ADD COLUMN training_plan_id UUID
    REFERENCES training_plans(id) ON DELETE SET NULL;

CREATE INDEX idx_assets_training_plan_id ON assets(training_plan_id);
```

- [ ] **Step 2: Write the down migration**

`db/migrations/20260612000000_create_training_plans.down.sql`:

```sql
ALTER TABLE assets DROP COLUMN IF EXISTS training_plan_id;
DROP TABLE IF EXISTS training_plans;
```

- [ ] **Step 3: Write the training plan queries**

`db/queries/training_plans.sql`:

```sql
-- name: CreateTrainingPlan :one
INSERT INTO training_plans (group_id, owner_id, title, description, steps)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListGroupTrainingPlans :many
SELECT tp.*,
    (SELECT COUNT(*) FROM assets a
     WHERE a.training_plan_id = tp.id AND a.status != 'waiting_upload')::bigint AS asset_count
FROM training_plans tp
WHERE tp.group_id = sqlc.arg(group_id)
  AND (sqlc.arg(include_archived)::boolean OR tp.archived_at IS NULL)
ORDER BY tp.created_at DESC;

-- name: GetTrainingPlan :one
SELECT tp.*,
    (SELECT COUNT(*) FROM assets a
     WHERE a.training_plan_id = tp.id AND a.status != 'waiting_upload')::bigint AS asset_count
FROM training_plans tp
WHERE tp.id = sqlc.arg(id);

-- name: UpdateTrainingPlan :one
UPDATE training_plans
SET title = sqlc.arg(title),
    description = sqlc.arg(description),
    steps = sqlc.arg(steps),
    archived_at = CASE
        WHEN sqlc.arg(archived)::boolean THEN COALESCE(archived_at, NOW())
        ELSE NULL
    END,
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;
```

- [ ] **Step 4: Extend the asset queries**

In `db/queries/assets.sql` make three edits:

(a) `CreateAsset` — add the new column:

```sql
-- name: CreateAsset :one
INSERT INTO assets (name, description, group_id, owner_id, training_plan_id)
VALUES ($1, $2, $3, $4, $5) RETURNING *;
```

(b) `ListVisibleAssets` — add two columns to the SELECT list (after `a.owner_id,`) and one join (after the `rv` LATERAL join, before `WHERE`):

```sql
    a.training_plan_id,
    tp.title AS training_plan_title,
```

```sql
LEFT JOIN training_plans tp ON tp.id = a.training_plan_id
```

(c) `GetVisibleAsset` — same two columns after `a.group_id,` in the SELECT list, and the same `LEFT JOIN training_plans tp ON tp.id = a.training_plan_id` after the `LEFT JOIN groups g ...` line.

- [ ] **Step 5: Regenerate sqlc code and mocks**

```bash
make db:sqlc
go generate ./internal/db
```

Expected: `internal/db/training_plans.sql.go` appears; `internal/db/models.go` gains `TrainingPlan` (with `Steps []string`, `ArchivedAt pgtype.Timestamptz`); `CreateAssetParams` gains `TrainingPlanID pgtype.UUID`; `mock_querier.go` regenerated.

- [ ] **Step 6: Fix any broken CreateAsset call sites**

```bash
grep -rn "CreateAssetParams{" internal/ --include="*.go" | grep -v mocks | grep -v sql.go
```

For every call site **other than** `internal/assets/handler.go` (expected: a coaching recording-import in `internal/coaching/`), the struct literal still compiles because the new field is optional — only act if the build fails. Verify:

```bash
make api:build
```

Expected: build passes. If a call site fails, add `TrainingPlanID: pgtype.UUID{},` to its params.

- [ ] **Step 7: Run unit tests, then commit**

```bash
make test:unit
git add db/migrations/20260612000000_create_training_plans.up.sql db/migrations/20260612000000_create_training_plans.down.sql db/queries/training_plans.sql db/queries/assets.sql internal/db/
git commit -m "feat(db): add training_plans table and asset training_plan_id"
```

---

### Task 2: Backend permission constants

**Files:**
- Modify: `internal/permissions/permissions.go`

- [ ] **Step 1: Add the constants**

In the `const` block of `internal/permissions/permissions.go`, after `GroupsDelete`:

```go
	TrainingPlansCreate = "training-plans:create"
	TrainingPlansRead   = "training-plans:read"
	TrainingPlansEdit   = "training-plans:edit"
```

- [ ] **Step 2: Build and commit**

```bash
make api:build
git add internal/permissions/permissions.go
git commit -m "feat(permissions): add training-plans permissions"
```

---

### Task 3: Training plans handler — CreatePlan (TDD)

**Files:**
- Create: `internal/trainingplans/handler.go`
- Create: `internal/trainingplans/handler_test.go`

- [ ] **Step 1: Write the failing tests**

`internal/trainingplans/handler_test.go`:

```go
package trainingplans

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

const testGroupIDStr = "01020304-0506-0708-090a-0b0c0d0e0f10"

func testUserCtx(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func withChiURLParam(r *http.Request, key, value string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

func testUUID() pgtype.UUID {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	return u
}

func expertUser() *auth.UserContext {
	return &auth.UserContext{
		ID:   "expert-1",
		Role: permissions.RoleExpert,
		Permissions: []string{
			permissions.TrainingPlansCreate,
			permissions.TrainingPlansRead,
			permissions.TrainingPlansEdit,
		},
	}
}

func studentUser() *auth.UserContext {
	return &auth.UserContext{
		ID:          "student-1",
		Role:        permissions.RoleStudent,
		Permissions: []string{permissions.TrainingPlansRead},
	}
}

func testPlan(ownerID string) db.TrainingPlan {
	return db.TrainingPlan{
		ID:          testUUID(),
		GroupID:     testUUID(),
		OwnerID:     ownerID,
		Title:       "Dressage test E5",
		Description: "Ride the full test",
		Steps:       []string{"Enter at A", "Halt at X"},
		CreatedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
}

func TestCreatePlan_ForbiddenWithoutPermission(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	req := httptest.NewRequest(http.MethodPost, "/groups/"+testGroupIDStr+"/training-plans",
		strings.NewReader(`{"title":"Test"}`))
	req = withChiURLParam(req, "groupID", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), studentUser()))
	rec := httptest.NewRecorder()

	h.CreatePlan(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestCreatePlan_ForbiddenWhenNotGroupOwner(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetGroup(gomock.Any(), testUUID()).Return(db.Group{OwnerID: "someone-else"}, nil)

	req := httptest.NewRequest(http.MethodPost, "/groups/"+testGroupIDStr+"/training-plans",
		strings.NewReader(`{"title":"Test"}`))
	req = withChiURLParam(req, "groupID", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), expertUser()))
	rec := httptest.NewRecorder()

	h.CreatePlan(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestCreatePlan_RejectsEmptyTitle(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetGroup(gomock.Any(), testUUID()).Return(db.Group{OwnerID: "expert-1"}, nil)

	req := httptest.NewRequest(http.MethodPost, "/groups/"+testGroupIDStr+"/training-plans",
		strings.NewReader(`{"title":"   "}`))
	req = withChiURLParam(req, "groupID", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), expertUser()))
	rec := httptest.NewRecorder()

	h.CreatePlan(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestCreatePlan_SuccessTrimsAndFiltersSteps(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetGroup(gomock.Any(), testUUID()).Return(db.Group{OwnerID: "expert-1"}, nil)
	q.EXPECT().CreateTrainingPlan(gomock.Any(), db.CreateTrainingPlanParams{
		GroupID:     testUUID(),
		OwnerID:     "expert-1",
		Title:       "Dressage test E5",
		Description: "Ride the full test",
		Steps:       []string{"Enter at A", "Halt at X"},
	}).Return(testPlan("expert-1"), nil)

	body := `{"title":" Dressage test E5 ","description":"Ride the full test","steps":["Enter at A","  ","Halt at X"]}`
	req := httptest.NewRequest(http.MethodPost, "/groups/"+testGroupIDStr+"/training-plans",
		strings.NewReader(body))
	req = withChiURLParam(req, "groupID", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), expertUser()))
	rec := httptest.NewRecorder()

	h.CreatePlan(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"title":"Dressage test E5"`) {
		t.Errorf("response missing title: %s", rec.Body.String())
	}
}
```

- [ ] **Step 2: Run to verify the tests fail**

```bash
go test ./internal/trainingplans/...
```

Expected: FAIL — package does not compile (`NewHandler` undefined).

- [ ] **Step 3: Write the handler with CreatePlan**

`internal/trainingplans/handler.go`:

```go
package trainingplans

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type planResponse struct {
	ID          string   `json:"id"`
	GroupID     string   `json:"group_id"`
	OwnerID     string   `json:"owner_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Steps       []string `json:"steps"`
	Archived    bool     `json:"archived"`
	AssetCount  int64    `json:"asset_count"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

func toPlanResponse(p db.TrainingPlan, assetCount int64) planResponse {
	steps := p.Steps
	if steps == nil {
		steps = []string{}
	}
	return planResponse{
		ID:          pgutil.UUIDToString(p.ID),
		GroupID:     pgutil.UUIDToString(p.GroupID),
		OwnerID:     p.OwnerID,
		Title:       p.Title,
		Description: p.Description,
		Steps:       steps,
		Archived:    p.ArchivedAt.Valid,
		AssetCount:  assetCount,
		CreatedAt:   p.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:   p.UpdatedAt.Time.Format(time.RFC3339),
	}
}

type Handler struct {
	q      db.Querier
	logger *slog.Logger
}

func NewHandler(q db.Querier, logger *slog.Logger) *Handler {
	return &Handler{q: q, logger: logger}
}

type planRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Steps       []string `json:"steps"`
}

func sanitizeSteps(steps []string) []string {
	out := make([]string, 0, len(steps))
	for _, s := range steps {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func (h *Handler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.TrainingPlansCreate) {
		log.WarnContext(ctx, "training_plan_create_permission_denied",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("role", user.Role),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	var groupID pgtype.UUID
	if err := groupID.Scan(groupIDStr); err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	group, err := h.q.GetGroup(ctx, groupID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	if group.OwnerID != user.ID {
		log.WarnContext(ctx, "training_plan_create_not_group_owner",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req planRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	plan, err := h.q.CreateTrainingPlan(ctx, db.CreateTrainingPlanParams{
		GroupID:     groupID,
		OwnerID:     user.ID,
		Title:       req.Title,
		Description: req.Description,
		Steps:       sanitizeSteps(req.Steps),
	})
	if err != nil {
		log.ErrorContext(ctx, "training_plan_create_failed",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create training plan", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "training_plan_created",
		slog.String("component", "trainingplans"),
		slog.String("user_id", user.ID),
		slog.String("group_id", groupIDStr),
		slog.String("training_plan_id", pgutil.UUIDToString(plan.ID)),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toPlanResponse(plan, 0))
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
go test ./internal/trainingplans/...
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/trainingplans/
git commit -m "feat(trainingplans): add CreatePlan handler"
```

---

### Task 4: Training plans handler — ListPlans + GetPlan (TDD)

**Files:**
- Modify: `internal/trainingplans/handler.go`
- Modify: `internal/trainingplans/handler_test.go`

- [ ] **Step 1: Write the failing tests** (append to `handler_test.go`)

```go
func TestListPlans_MemberSeesOnlyActive(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetGroup(gomock.Any(), testUUID()).Return(db.Group{OwnerID: "someone-else"}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "student-1",
		GroupID: testUUID(),
	}).Return(true, nil)
	q.EXPECT().ListGroupTrainingPlans(gomock.Any(), db.ListGroupTrainingPlansParams{
		GroupID:         testUUID(),
		IncludeArchived: false,
	}).Return([]db.ListGroupTrainingPlansRow{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/groups/"+testGroupIDStr+"/training-plans", nil)
	req = withChiURLParam(req, "groupID", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), studentUser()))
	rec := httptest.NewRecorder()

	h.ListPlans(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("got %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestListPlans_OwnerIncludesArchived(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetGroup(gomock.Any(), testUUID()).Return(db.Group{OwnerID: "expert-1"}, nil)
	q.EXPECT().ListGroupTrainingPlans(gomock.Any(), db.ListGroupTrainingPlansParams{
		GroupID:         testUUID(),
		IncludeArchived: true,
	}).Return([]db.ListGroupTrainingPlansRow{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/groups/"+testGroupIDStr+"/training-plans", nil)
	req = withChiURLParam(req, "groupID", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), expertUser()))
	rec := httptest.NewRecorder()

	h.ListPlans(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("got %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestGetPlan_ForbiddenForNonMember(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	plan := testPlan("someone-else")
	q.EXPECT().GetTrainingPlan(gomock.Any(), testUUID()).Return(db.GetTrainingPlanRow{
		ID:      plan.ID,
		GroupID: plan.GroupID,
		OwnerID: plan.OwnerID,
		Title:   plan.Title,
	}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "student-1",
		GroupID: testUUID(),
	}).Return(false, nil)

	req := httptest.NewRequest(http.MethodGet, "/training-plans/"+testGroupIDStr, nil)
	req = withChiURLParam(req, "id", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), studentUser()))
	rec := httptest.NewRecorder()

	h.GetPlan(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestGetPlan_MemberCanReadArchivedPlan(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	plan := testPlan("someone-else")
	q.EXPECT().GetTrainingPlan(gomock.Any(), testUUID()).Return(db.GetTrainingPlanRow{
		ID:          plan.ID,
		GroupID:     plan.GroupID,
		OwnerID:     plan.OwnerID,
		Title:       plan.Title,
		Description: plan.Description,
		Steps:       plan.Steps,
		ArchivedAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
		CreatedAt:   plan.CreatedAt,
		UpdatedAt:   plan.UpdatedAt,
		AssetCount:  3,
	}, nil)
	q.EXPECT().CheckUserGroup(gomock.Any(), db.CheckUserGroupParams{
		UserID:  "student-1",
		GroupID: testUUID(),
	}).Return(true, nil)

	req := httptest.NewRequest(http.MethodGet, "/training-plans/"+testGroupIDStr, nil)
	req = withChiURLParam(req, "id", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), studentUser()))
	rec := httptest.NewRecorder()

	h.GetPlan(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusOK)
	}
	if !strings.Contains(rec.Body.String(), `"archived":true`) {
		t.Errorf("response missing archived flag: %s", rec.Body.String())
	}
}
```

- [ ] **Step 2: Run to verify the tests fail**

```bash
go test ./internal/trainingplans/...
```

Expected: FAIL — `h.ListPlans`/`h.GetPlan` undefined.

- [ ] **Step 3: Implement ListPlans and GetPlan** (append to `handler.go`)

```go
func (h *Handler) ListPlans(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.TrainingPlansRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	var groupID pgtype.UUID
	if err := groupID.Scan(groupIDStr); err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	group, err := h.q.GetGroup(ctx, groupID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	isOwner := group.OwnerID == user.ID
	if !isOwner {
		inGroup, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
			UserID:  user.ID,
			GroupID: groupID,
		})
		if err != nil || !inGroup {
			http.Error(w, "Permission denied", http.StatusForbidden)
			return
		}
	}

	rows, err := h.q.ListGroupTrainingPlans(ctx, db.ListGroupTrainingPlansParams{
		GroupID:         groupID,
		IncludeArchived: isOwner,
	})
	if err != nil {
		log.ErrorContext(ctx, "training_plan_list_failed",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list training plans", http.StatusInternalServerError)
		return
	}

	dtos := make([]planResponse, len(rows))
	for i, row := range rows {
		dtos[i] = toPlanResponse(db.TrainingPlan{
			ID:          row.ID,
			GroupID:     row.GroupID,
			OwnerID:     row.OwnerID,
			Title:       row.Title,
			Description: row.Description,
			Steps:       row.Steps,
			ArchivedAt:  row.ArchivedAt,
			CreatedAt:   row.CreatedAt,
			UpdatedAt:   row.UpdatedAt,
		}, row.AssetCount)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

func (h *Handler) GetPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.TrainingPlansRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var planID pgtype.UUID
	if err := planID.Scan(idStr); err != nil {
		http.Error(w, "Invalid training plan ID", http.StatusBadRequest)
		return
	}

	row, err := h.q.GetTrainingPlan(ctx, planID)
	if err != nil {
		http.Error(w, "Training plan not found", http.StatusNotFound)
		return
	}

	// Owner may always read; everyone else needs group membership.
	if row.OwnerID != user.ID {
		inGroup, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
			UserID:  user.ID,
			GroupID: row.GroupID,
		})
		if err != nil || !inGroup {
			http.Error(w, "Permission denied", http.StatusForbidden)
			return
		}
	}

	log.DebugContext(ctx, "training_plan_read",
		slog.String("component", "trainingplans"),
		slog.String("user_id", user.ID),
		slog.String("training_plan_id", idStr),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toPlanResponse(db.TrainingPlan{
		ID:          row.ID,
		GroupID:     row.GroupID,
		OwnerID:     row.OwnerID,
		Title:       row.Title,
		Description: row.Description,
		Steps:       row.Steps,
		ArchivedAt:  row.ArchivedAt,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}, row.AssetCount))
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
go test ./internal/trainingplans/...
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/trainingplans/
git commit -m "feat(trainingplans): add ListPlans and GetPlan handlers"
```

---

### Task 5: Training plans handler — UpdatePlan with archive (TDD)

**Files:**
- Modify: `internal/trainingplans/handler.go`
- Modify: `internal/trainingplans/handler_test.go`

- [ ] **Step 1: Write the failing tests** (append to `handler_test.go`)

```go
func TestUpdatePlan_ForbiddenForNonOwner(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetTrainingPlan(gomock.Any(), testUUID()).Return(db.GetTrainingPlanRow{
		ID:      testUUID(),
		GroupID: testUUID(),
		OwnerID: "someone-else",
	}, nil)

	req := httptest.NewRequest(http.MethodPatch, "/training-plans/"+testGroupIDStr,
		strings.NewReader(`{"title":"New","steps":[],"archived":false}`))
	req = withChiURLParam(req, "id", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), expertUser()))
	rec := httptest.NewRecorder()

	h.UpdatePlan(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestUpdatePlan_OwnerCanArchive(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	q.EXPECT().GetTrainingPlan(gomock.Any(), testUUID()).Return(db.GetTrainingPlanRow{
		ID:         testUUID(),
		GroupID:    testUUID(),
		OwnerID:    "expert-1",
		AssetCount: 2,
	}, nil)
	archived := testPlan("expert-1")
	archived.ArchivedAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	q.EXPECT().UpdateTrainingPlan(gomock.Any(), db.UpdateTrainingPlanParams{
		ID:          testUUID(),
		Title:       "Dressage test E5",
		Description: "Ride the full test",
		Steps:       []string{"Enter at A"},
		Archived:    true,
	}).Return(archived, nil)

	body := `{"title":"Dressage test E5","description":"Ride the full test","steps":["Enter at A"],"archived":true}`
	req := httptest.NewRequest(http.MethodPatch, "/training-plans/"+testGroupIDStr,
		strings.NewReader(body))
	req = withChiURLParam(req, "id", testGroupIDStr)
	req = req.WithContext(testUserCtx(req.Context(), expertUser()))
	rec := httptest.NewRecorder()

	h.UpdatePlan(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"archived":true`) {
		t.Errorf("response missing archived flag: %s", rec.Body.String())
	}
}
```

- [ ] **Step 2: Run to verify the tests fail**

```bash
go test ./internal/trainingplans/...
```

Expected: FAIL — `h.UpdatePlan` undefined.

- [ ] **Step 3: Implement UpdatePlan** (append to `handler.go`)

```go
type updatePlanRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Steps       []string `json:"steps"`
	Archived    bool     `json:"archived"`
}

func (h *Handler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.TrainingPlansEdit) {
		log.WarnContext(ctx, "training_plan_edit_permission_denied",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("role", user.Role),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var planID pgtype.UUID
	if err := planID.Scan(idStr); err != nil {
		http.Error(w, "Invalid training plan ID", http.StatusBadRequest)
		return
	}

	existing, err := h.q.GetTrainingPlan(ctx, planID)
	if err != nil {
		http.Error(w, "Training plan not found", http.StatusNotFound)
		return
	}
	if existing.OwnerID != user.ID {
		log.WarnContext(ctx, "training_plan_edit_not_owner",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("training_plan_id", idStr),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req updatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	plan, err := h.q.UpdateTrainingPlan(ctx, db.UpdateTrainingPlanParams{
		ID:          planID,
		Title:       req.Title,
		Description: req.Description,
		Steps:       sanitizeSteps(req.Steps),
		Archived:    req.Archived,
	})
	if err != nil {
		log.ErrorContext(ctx, "training_plan_update_failed",
			slog.String("component", "trainingplans"),
			slog.String("user_id", user.ID),
			slog.String("training_plan_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update training plan", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "training_plan_updated",
		slog.String("component", "trainingplans"),
		slog.String("user_id", user.ID),
		slog.String("training_plan_id", idStr),
		slog.Bool("archived", plan.ArchivedAt.Valid),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toPlanResponse(plan, existing.AssetCount))
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
go test ./internal/trainingplans/...
```

Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/trainingplans/
git commit -m "feat(trainingplans): add UpdatePlan handler with archive support"
```

---

### Task 6: Route wiring + CORS PATCH

**Files:**
- Modify: `internal/api/server.go`

- [ ] **Step 1: Allow PATCH in CORS**

In `internal/api/server.go` the CORS config currently reads `AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}`. Add `"PATCH"`:

```go
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
```

- [ ] **Step 2: Construct the handler and register routes**

Add the import `"github.com/OZIOisgood/zeta/internal/trainingplans"`, then next to the other handler constructions (after `reportsHandler := ...`):

```go
	trainingPlansHandler := trainingplans.NewHandler(queries, s.Logger)
```

Inside the protected `r.Route("/groups", func(r chi.Router) {...})` block, add after the invitation routes:

```go
			r.Get("/{groupID}/training-plans", trainingPlansHandler.ListPlans)
			r.Post("/{groupID}/training-plans", trainingPlansHandler.CreatePlan)
```

Inside the protected group (same level as `r.Route("/groups", ...)`), add:

```go
		r.Route("/training-plans", func(r chi.Router) {
			r.Get("/{id}", trainingPlansHandler.GetPlan)
			r.Patch("/{id}", trainingPlansHandler.UpdatePlan)
		})
```

- [ ] **Step 3: Build, test, commit**

```bash
make api:build
make test:unit
git add internal/api/server.go
git commit -m "feat(api): register training plan routes and allow PATCH"
```

---

### Task 7: Assets — accept and expose training_plan_id (TDD)

**Files:**
- Modify: `internal/assets/handler.go`
- Modify: `internal/assets/handler_test.go`

- [ ] **Step 1: Write the failing tests** (append to `internal/assets/handler_test.go`; reuse the helpers already in that file — check their exact names first with `grep -n "func " internal/assets/handler_test.go`)

```go
func TestCreateAsset_RejectsArchivedTrainingPlan(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	groupID := pgtype.UUID{Valid: true}
	copy(groupID.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	q.EXPECT().CheckUserGroup(gomock.Any(), gomock.Any()).Return(true, nil)
	q.EXPECT().GetTrainingPlan(gomock.Any(), groupID).Return(db.GetTrainingPlanRow{
		ID:         groupID,
		GroupID:    groupID,
		ArchivedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}, nil)

	body := `{"title":"Ride","group_id":"01020304-0506-0708-090a-0b0c0d0e0f10","training_plan_id":"01020304-0506-0708-090a-0b0c0d0e0f10","filenames":[]}`
	req := httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserKey, &auth.UserContext{
		ID:          "student-1",
		Role:        permissions.RoleStudent,
		Permissions: []string{permissions.AssetsCreate},
	}))
	rec := httptest.NewRecorder()

	h.CreateAsset(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("got %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
}

func TestCreateAsset_RejectsTrainingPlanFromOtherGroup(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), "")

	groupID := pgtype.UUID{Valid: true}
	copy(groupID.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	otherGroupID := pgtype.UUID{Valid: true}
	copy(otherGroupID.Bytes[:], []byte{9, 9, 9, 9, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	q.EXPECT().CheckUserGroup(gomock.Any(), gomock.Any()).Return(true, nil)
	q.EXPECT().GetTrainingPlan(gomock.Any(), groupID).Return(db.GetTrainingPlanRow{
		ID:      groupID,
		GroupID: otherGroupID,
	}, nil)

	body := `{"title":"Ride","group_id":"01020304-0506-0708-090a-0b0c0d0e0f10","training_plan_id":"01020304-0506-0708-090a-0b0c0d0e0f10","filenames":[]}`
	req := httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), auth.UserKey, &auth.UserContext{
		ID:          "student-1",
		Role:        permissions.RoleStudent,
		Permissions: []string{permissions.AssetsCreate},
	}))
	rec := httptest.NewRecorder()

	h.CreateAsset(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("got %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
}
```

If the existing test file is missing any imports used above (`context`, `strings`, `time`, `auth`, `permissions`), add them.

- [ ] **Step 2: Run to verify the tests fail**

```bash
go test ./internal/assets/...
```

Expected: FAIL — handler returns 200/500 instead of 422 (no validation yet; the JSON field is ignored).

- [ ] **Step 3: Implement the validation and persistence**

In `internal/assets/handler.go`:

(a) Extend the request type:

```go
type CreateAssetRequest struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Filenames      []string `json:"filenames"`
	GroupID        string   `json:"group_id"`
	TrainingPlanID string   `json:"training_plan_id"`
}
```

(b) In `CreateAsset`, after the group-membership check (`if !isMember {...}` block) and before `h.q.CreateAsset`, insert:

```go
	var trainingPlanID pgtype.UUID
	if req.TrainingPlanID != "" {
		if err := trainingPlanID.Scan(req.TrainingPlanID); err != nil {
			http.Error(w, "Invalid training plan ID", http.StatusBadRequest)
			return
		}
		plan, err := h.q.GetTrainingPlan(ctx, trainingPlanID)
		if err != nil {
			http.Error(w, "Training plan not found", http.StatusUnprocessableEntity)
			return
		}
		if plan.GroupID != groupID {
			http.Error(w, "Training plan does not belong to the selected group", http.StatusUnprocessableEntity)
			return
		}
		if plan.ArchivedAt.Valid {
			http.Error(w, "Training plan is archived", http.StatusUnprocessableEntity)
			return
		}
	}
```

(c) Pass it through in the `CreateAssetParams` literal:

```go
	asset, err := h.q.CreateAsset(ctx, db.CreateAssetParams{
		Name:           req.Title,
		Description:    req.Description,
		GroupID:        groupID,
		OwnerID:        userCtx.ID,
		TrainingPlanID: trainingPlanID,
	})
```

(d) Expose the plan on responses. Add next to `GroupInfo`:

```go
type TrainingPlanInfo struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}
```

Add to `AssetItem`:

```go
	TrainingPlan *TrainingPlanInfo `json:"training_plan,omitempty"`
```

In `ListAssets`, inside the response-mapping loop after `ReviewCount: a.ReviewCount,` close the struct literal, then add:

```go
		if a.TrainingPlanID.Valid {
			resp[i].TrainingPlan = &TrainingPlanInfo{
				ID:    pgutil.UUIDToString(a.TrainingPlanID),
				Title: a.TrainingPlanTitle.String,
			}
		}
```

In `GetAsset`, next to the `var group *GroupInfo` mapping add:

```go
	var trainingPlan *TrainingPlanInfo
	if asset.TrainingPlanID.Valid {
		trainingPlan = &TrainingPlanInfo{
			ID:    pgutil.UUIDToString(asset.TrainingPlanID),
			Title: asset.TrainingPlanTitle.String,
		}
	}
```

and set `TrainingPlan: trainingPlan,` in the `resp := AssetItem{...}` literal.

- [ ] **Step 4: Run the tests, verify they pass**

```bash
go test ./internal/assets/...
make api:build
```

Expected: PASS, build green.

- [ ] **Step 5: Commit**

```bash
git add internal/assets/
git commit -m "feat(assets): link assets to training plans with validation"
```

---

### Task 8: Docs — README diagram + WorkOS deployment note

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the database diagram**

Find the database/ER section in `README.md` (search for `assets` or a mermaid block). Add the `training_plans` table with columns `id, group_id → groups, owner_id, title, description, steps[], archived_at` and the `assets.training_plan_id → training_plans` relation, in the same notation the diagram already uses.

- [ ] **Step 2: Document the manual WorkOS step**

In the auth/permissions section of `README.md` (or near the existing role/permission documentation), add:

```markdown
> **Training plans rollout:** the permissions `training-plans:create`, `training-plans:edit`
> (role `expert`) and `training-plans:read` (roles `expert` and `student`) must be assigned
> manually in WorkOS. Permissions are baked into the JWT at login, so existing users need to
> log in again before the feature appears.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document training plans schema and WorkOS rollout step"
```

---

### Task 9: Frontend — API client, Asset type, Permission union

**Files:**
- Create: `web/dashboard-next/src/app/core/http/training-plans-api.service.ts`
- Modify: `web/dashboard-next/src/app/core/http/assets-api.service.ts`
- Modify: `web/dashboard-next/src/app/core/permissions/permissions.service.ts`

- [ ] **Step 1: Create the API client**

`web/dashboard-next/src/app/core/http/training-plans-api.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type TrainingPlan = {
  id: string;
  group_id: string;
  owner_id: string;
  title: string;
  description: string;
  steps: string[];
  archived: boolean;
  asset_count: number;
  created_at: string;
  updated_at: string;
};

export type TrainingPlanPayload = {
  title: string;
  description: string;
  steps: string[];
};

@Injectable({ providedIn: 'root' })
export class TrainingPlansApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  listPlans(groupId: string): Observable<TrainingPlan[]> {
    return this.http.get<TrainingPlan[]>(`${this.env.apiUrl}/groups/${groupId}/training-plans`);
  }

  getPlan(id: string): Observable<TrainingPlan> {
    return this.http.get<TrainingPlan>(`${this.env.apiUrl}/training-plans/${id}`);
  }

  createPlan(groupId: string, payload: TrainingPlanPayload): Observable<TrainingPlan> {
    return this.http.post<TrainingPlan>(
      `${this.env.apiUrl}/groups/${groupId}/training-plans`,
      payload,
    );
  }

  updatePlan(
    id: string,
    payload: TrainingPlanPayload & { archived: boolean },
  ): Observable<TrainingPlan> {
    return this.http.patch<TrainingPlan>(`${this.env.apiUrl}/training-plans/${id}`, payload);
  }
}
```

- [ ] **Step 2: Extend the Asset type and createAsset payload**

In `web/dashboard-next/src/app/core/http/assets-api.service.ts`:

```ts
export type AssetTrainingPlan = {
  id: string;
  title: string;
};
```

Add to the `Asset` type:

```ts
  training_plan?: AssetTrainingPlan;
```

Extend `createAsset`'s `data` parameter type with:

```ts
    training_plan_id?: string;
```

- [ ] **Step 3: Extend the Permission union**

In `web/dashboard-next/src/app/core/permissions/permissions.service.ts`, add to the `Permission` union after `'reports:read'`:

```ts
  | 'training-plans:create'
  | 'training-plans:read'
  | 'training-plans:edit';
```

- [ ] **Step 4: Verify and commit**

```bash
make web-next:lint
make web-next:build
git add web/dashboard-next/src/app/core/
git commit -m "feat(dashboard): add training plans API client and types"
```

---

### Task 10: Frontend — TrainingPlansStore (TDD)

**Files:**
- Create: `web/dashboard-next/src/app/features/training-plans/training-plans.store.ts`
- Create: `web/dashboard-next/src/app/features/training-plans/training-plans.store.spec.ts`

- [ ] **Step 1: Write the failing spec**

`training-plans.store.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TrainingPlansApiClient } from '../../core/http/training-plans-api.service';
import { TrainingPlansStore } from './training-plans.store';

const plan = (id: string, archived = false) => ({
  id,
  group_id: 'group-1',
  owner_id: 'expert-1',
  title: `Plan ${id}`,
  description: '',
  steps: ['Enter at A'],
  archived,
  asset_count: 0,
  created_at: '2026-06-11T12:00:00Z',
  updated_at: '2026-06-11T12:00:00Z',
});

describe('TrainingPlansStore', () => {
  it('loads plans for a group and derives active plans', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TrainingPlansApiClient,
          useValue: { listPlans: () => of([plan('p1'), plan('p2', true)]) },
        },
      ],
    });
    const store = TestBed.inject(TrainingPlansStore);

    await store.loadPlans('group-1');

    expect(store.status()).toBe('success');
    expect(store.plans().length).toBe(2);
    expect(store.activePlans().length).toBe(1);
    expect(store.activePlans()[0].id).toBe('p1');
  });

  it('records an error when loading fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TrainingPlansApiClient,
          useValue: { listPlans: () => throwError(() => new Error('boom')) },
        },
      ],
    });
    const store = TestBed.inject(TrainingPlansStore);

    await store.loadPlans('group-1');

    expect(store.status()).toBe('error');
    expect(store.plans().length).toBe(0);
  });

  it('updates the plan list after updatePlan', async () => {
    const updated = { ...plan('p1'), title: 'Renamed', archived: true };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TrainingPlansApiClient,
          useValue: {
            listPlans: () => of([plan('p1')]),
            updatePlan: () => of(updated),
          },
        },
      ],
    });
    const store = TestBed.inject(TrainingPlansStore);
    await store.loadPlans('group-1');

    const result = await store.updatePlan('p1', {
      title: 'Renamed',
      description: '',
      steps: ['Enter at A'],
      archived: true,
    });

    expect(result?.title).toBe('Renamed');
    expect(store.plans()[0].archived).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify the spec fails**

```bash
make web-next:test
```

Expected: FAIL — cannot resolve `./training-plans.store`.

- [ ] **Step 3: Implement the store**

`training-plans.store.ts`:

```ts
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  TrainingPlan,
  TrainingPlanPayload,
  TrainingPlansApiClient,
} from '../../core/http/training-plans-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type TrainingPlansState = AsyncSlice & {
  plans: TrainingPlan[];
  plansGroupId: string | null;
  activePlan: TrainingPlan | null;
  detailStatus: AsyncSlice['status'];
  detailError: string | null;
  saveStatus: AsyncSlice['status'];
  saveError: string | null;
};

const initialState: TrainingPlansState = {
  ...idleAsyncSlice(),
  plans: [],
  plansGroupId: null,
  activePlan: null,
  detailStatus: 'idle',
  detailError: null,
  saveStatus: 'idle',
  saveError: null,
};

export const TrainingPlansStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activePlans: computed(() => store.plans().filter((plan) => !plan.archived)),
  })),
  withMethods((store, api = inject(TrainingPlansApiClient)) => ({
    async loadPlans(groupId: string): Promise<void> {
      patchState(store, { ...loadingAsyncSlice(), plansGroupId: groupId });
      try {
        const plans = await firstValueFrom(api.listPlans(groupId));
        patchState(store, { ...successAsyncSlice(), plans });
      } catch (error) {
        patchState(store, { ...errorAsyncSlice(error), plans: [] });
      }
    },
    async loadPlan(id: string): Promise<void> {
      patchState(store, { detailStatus: 'loading', detailError: null, activePlan: null });
      try {
        const activePlan = await firstValueFrom(api.getPlan(id));
        patchState(store, { detailStatus: 'success', activePlan });
      } catch (error) {
        const e = errorAsyncSlice(error);
        patchState(store, { detailStatus: e.status, detailError: e.error });
      }
    },
    async createPlan(groupId: string, payload: TrainingPlanPayload): Promise<TrainingPlan | null> {
      patchState(store, { saveStatus: 'loading', saveError: null });
      try {
        const created = await firstValueFrom(api.createPlan(groupId, payload));
        patchState(store, { saveStatus: 'success', plans: [created, ...store.plans()] });
        return created;
      } catch (error) {
        const e = errorAsyncSlice(error);
        patchState(store, { saveStatus: e.status, saveError: e.error });
        return null;
      }
    },
    async updatePlan(
      id: string,
      payload: TrainingPlanPayload & { archived: boolean },
    ): Promise<TrainingPlan | null> {
      patchState(store, { saveStatus: 'loading', saveError: null });
      try {
        const updated = await firstValueFrom(api.updatePlan(id, payload));
        patchState(store, {
          saveStatus: 'success',
          activePlan: store.activePlan()?.id === id ? updated : store.activePlan(),
          plans: store.plans().map((plan) => (plan.id === id ? updated : plan)),
        });
        return updated;
      } catch (error) {
        const e = errorAsyncSlice(error);
        patchState(store, { saveStatus: e.status, saveError: e.error });
        return null;
      }
    },
  })),
);
```

- [ ] **Step 4: Run the spec, verify it passes**

```bash
make web-next:test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/dashboard-next/src/app/features/training-plans/
git commit -m "feat(dashboard): add training plans signal store"
```

---

### Task 11: Frontend — i18n keys (de/en/fr)

**Files:**
- Modify: `web/dashboard-next/public/i18n/en.json`
- Modify: `web/dashboard-next/public/i18n/de.json`
- Modify: `web/dashboard-next/public/i18n/fr.json`

Doing i18n before the pages so templates never reference missing keys.

- [ ] **Step 1: Add the English block** (top-level key, alphabetical placement is not required — append after `"groups"`)

```json
"trainingPlans": {
  "title": "Training plans",
  "sectionDescription": "Exercises and test programs from your coach. Upload a video for a plan to get feedback.",
  "create": "Create plan",
  "emptyTitle": "No training plans yet",
  "emptyDescription": "Training plans created for this group will show up here.",
  "steps": "Steps",
  "videos": "Videos",
  "archived": "Archived",
  "archive": "Archive",
  "unarchive": "Unarchive",
  "edit": "Edit",
  "archivedHint": "This plan is archived. New videos can no longer be linked to it.",
  "uploadForPlan": "Upload a video for this plan",
  "linkedVideos": "Uploaded videos",
  "noLinkedVideos": "No videos for this plan yet.",
  "planLabel": "Training plan",
  "optionalPlanLabel": "Training plan (optional)",
  "choosePlan": "Choose a training plan",
  "noPlan": "No training plan",
  "searchPlans": "Search training plans",
  "togglePlans": "Toggle training plan list",
  "noPlansAvailable": "No training plans available",
  "loadFailed": "Training plans could not be loaded.",
  "form": {
    "createTitle": "Create training plan",
    "editTitle": "Edit training plan",
    "titlePlaceholder": "e.g. Dressage test E5",
    "titleRequired": "Title is required",
    "descriptionPlaceholder": "What is this plan about?",
    "stepsLabel": "Steps",
    "stepsHint": "One instruction per line, in riding order.",
    "stepPlaceholder": "e.g. Enter at A, halt at X",
    "addStep": "Add step",
    "removeStep": "Remove step",
    "moveUp": "Move up",
    "moveDown": "Move down",
    "save": "Save plan",
    "saveFailed": "The plan could not be saved."
  }
}
```

- [ ] **Step 2: Add the German block** (same structure)

```json
"trainingPlans": {
  "title": "Trainingspläne",
  "sectionDescription": "Übungen und Aufgaben von deinem Trainer. Lade ein Video zu einem Plan hoch, um Feedback zu erhalten.",
  "create": "Plan anlegen",
  "emptyTitle": "Noch keine Trainingspläne",
  "emptyDescription": "Trainingspläne für diese Gruppe erscheinen hier.",
  "steps": "Schritte",
  "videos": "Videos",
  "archived": "Archiviert",
  "archive": "Archivieren",
  "unarchive": "Dearchivieren",
  "edit": "Bearbeiten",
  "archivedHint": "Dieser Plan ist archiviert. Neue Videos können nicht mehr verknüpft werden.",
  "uploadForPlan": "Video zu diesem Plan hochladen",
  "linkedVideos": "Hochgeladene Videos",
  "noLinkedVideos": "Noch keine Videos zu diesem Plan.",
  "planLabel": "Trainingsplan",
  "optionalPlanLabel": "Trainingsplan (optional)",
  "choosePlan": "Trainingsplan auswählen",
  "noPlan": "Kein Trainingsplan",
  "searchPlans": "Trainingspläne durchsuchen",
  "togglePlans": "Trainingsplan-Liste umschalten",
  "noPlansAvailable": "Keine Trainingspläne verfügbar",
  "loadFailed": "Trainingspläne konnten nicht geladen werden.",
  "form": {
    "createTitle": "Trainingsplan anlegen",
    "editTitle": "Trainingsplan bearbeiten",
    "titlePlaceholder": "z. B. Dressuraufgabe E5",
    "titleRequired": "Titel ist erforderlich",
    "descriptionPlaceholder": "Worum geht es in diesem Plan?",
    "stepsLabel": "Schritte",
    "stepsHint": "Eine Anweisung pro Zeile, in Reihenfolge.",
    "stepPlaceholder": "z. B. Bei A einreiten, bei X halten",
    "addStep": "Schritt hinzufügen",
    "removeStep": "Schritt entfernen",
    "moveUp": "Nach oben",
    "moveDown": "Nach unten",
    "save": "Plan speichern",
    "saveFailed": "Der Plan konnte nicht gespeichert werden."
  }
}
```

- [ ] **Step 3: Add the French block**

```json
"trainingPlans": {
  "title": "Plans d'entraînement",
  "sectionDescription": "Exercices et reprises de votre coach. Téléversez une vidéo pour un plan afin de recevoir un retour.",
  "create": "Créer un plan",
  "emptyTitle": "Aucun plan d'entraînement",
  "emptyDescription": "Les plans d'entraînement de ce groupe apparaîtront ici.",
  "steps": "Étapes",
  "videos": "Vidéos",
  "archived": "Archivé",
  "archive": "Archiver",
  "unarchive": "Désarchiver",
  "edit": "Modifier",
  "archivedHint": "Ce plan est archivé. Il n'est plus possible d'y associer de nouvelles vidéos.",
  "uploadForPlan": "Téléverser une vidéo pour ce plan",
  "linkedVideos": "Vidéos téléversées",
  "noLinkedVideos": "Aucune vidéo pour ce plan pour l'instant.",
  "planLabel": "Plan d'entraînement",
  "optionalPlanLabel": "Plan d'entraînement (optionnel)",
  "choosePlan": "Choisir un plan d'entraînement",
  "noPlan": "Aucun plan d'entraînement",
  "searchPlans": "Rechercher des plans",
  "togglePlans": "Afficher la liste des plans",
  "noPlansAvailable": "Aucun plan disponible",
  "loadFailed": "Impossible de charger les plans d'entraînement.",
  "form": {
    "createTitle": "Créer un plan d'entraînement",
    "editTitle": "Modifier le plan d'entraînement",
    "titlePlaceholder": "p. ex. Reprise de dressage E5",
    "titleRequired": "Le titre est obligatoire",
    "descriptionPlaceholder": "De quoi s'agit-il ?",
    "stepsLabel": "Étapes",
    "stepsHint": "Une instruction par ligne, dans l'ordre.",
    "stepPlaceholder": "p. ex. Entrer en A, arrêt en X",
    "addStep": "Ajouter une étape",
    "removeStep": "Supprimer l'étape",
    "moveUp": "Monter",
    "moveDown": "Descendre",
    "save": "Enregistrer le plan",
    "saveFailed": "Le plan n'a pas pu être enregistré."
  }
}
```

- [ ] **Step 4: Validate JSON and commit**

```bash
python3 -c "import json; [json.load(open(f'web/dashboard-next/public/i18n/{l}.json')) for l in ['de','en','fr']]; print('ok')"
git add web/dashboard-next/public/i18n/
git commit -m "feat(dashboard): add training plan translations (de/en/fr)"
```

---

### Task 12: Frontend — routes + create/edit page

**Files:**
- Create: `web/dashboard-next/src/app/pages/training-plans/edit-training-plan-page.component.ts`
- Modify: `web/dashboard-next/src/app/app.routes.ts`

- [ ] **Step 1: Create the form page** (one component for create + edit; mode derived from the `planId` route param)

`edit-training-plan-page.component.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideArrowDown, LucideArrowUp, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { TrainingPlansStore } from '../../features/training-plans/training-plans.store';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

@Component({
  selector: 'app-edit-training-plan-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZIconButtonComponent,
    ZSkeletonComponent,
    ZTextInputComponent,
    ZTextareaComponent,
    LucideArrowDown,
    LucideArrowUp,
    LucidePlus,
    LucideTrash2,
  ],
  template: `
    <div class="grid min-w-0 gap-6">
      <z-breadcrumbs
        [items]="[
          { label: 'groups.title', routerLink: '/groups' },
          { label: 'trainingPlans.title', routerLink: groupLink() },
          { label: isEdit() ? 'trainingPlans.form.editTitle' : 'trainingPlans.form.createTitle' },
        ]"
      />

      @if (isEdit() && store.detailStatus() === 'loading') {
        <z-skeleton class="block h-64 w-full"></z-skeleton>
      } @else {
        <form
          class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
          [formGroup]="form"
          (ngSubmit)="save()"
        >
          <h2 class="text-2xl font-semibold">
            {{
              (isEdit() ? 'trainingPlans.form.editTitle' : 'trainingPlans.form.createTitle')
                | transloco
            }}
          </h2>

          <label class="grid gap-2">
            <z-field-label
              [label]="'common.fields.title' | transloco"
              [control]="form.controls.title"
            />
            <z-text-input
              formControlName="title"
              [placeholder]="'trainingPlans.form.titlePlaceholder' | transloco"
              [invalid]="
                (form.controls.title.dirty || form.controls.title.touched) &&
                form.controls.title.invalid
              "
            />
            @if (
              (form.controls.title.dirty || form.controls.title.touched) &&
              form.controls.title.invalid
            ) {
              <z-field-error [message]="'trainingPlans.form.titleRequired' | transloco" />
            }
          </label>

          <label class="grid gap-2">
            <z-field-label
              [label]="'common.fields.description' | transloco"
              [control]="form.controls.description"
            />
            <z-textarea
              formControlName="description"
              [placeholder]="'trainingPlans.form.descriptionPlaceholder' | transloco"
            />
          </label>

          <div class="grid gap-2">
            <z-field-label [label]="'trainingPlans.form.stepsLabel' | transloco" />
            <p class="text-xs text-[var(--z-muted)]">
              {{ 'trainingPlans.form.stepsHint' | transloco }}
            </p>
            <div class="grid gap-2" formArrayName="steps">
              @for (control of form.controls.steps.controls; track control; let i = $index) {
                <div class="flex items-center gap-2">
                  <span class="w-6 shrink-0 text-right text-sm text-[var(--z-muted)]">
                    {{ i + 1 }}.
                  </span>
                  <z-text-input
                    class="min-w-0 flex-1"
                    [formControlName]="i"
                    [placeholder]="'trainingPlans.form.stepPlaceholder' | transloco"
                  />
                  <z-icon-button
                    [ariaLabel]="'trainingPlans.form.moveUp' | transloco"
                    [disabled]="i === 0"
                    (pressed)="moveStep(i, -1)"
                  >
                    <svg lucideArrowUp class="size-4" aria-hidden="true"></svg>
                  </z-icon-button>
                  <z-icon-button
                    [ariaLabel]="'trainingPlans.form.moveDown' | transloco"
                    [disabled]="i === form.controls.steps.length - 1"
                    (pressed)="moveStep(i, 1)"
                  >
                    <svg lucideArrowDown class="size-4" aria-hidden="true"></svg>
                  </z-icon-button>
                  <z-icon-button
                    [ariaLabel]="'trainingPlans.form.removeStep' | transloco"
                    (pressed)="removeStep(i)"
                  >
                    <svg lucideTrash2 class="size-4" aria-hidden="true"></svg>
                  </z-icon-button>
                </div>
              }
            </div>
            <div>
              <z-button variant="secondary" size="sm" type="button" (pressed)="addStep()">
                <svg lucidePlus class="size-4" aria-hidden="true"></svg>
                {{ 'trainingPlans.form.addStep' | transloco }}
              </z-button>
            </div>
          </div>

          @if (store.saveStatus() === 'error') {
            <p class="text-sm text-[var(--z-danger)]">
              {{ store.saveError() || ('trainingPlans.form.saveFailed' | transloco) }}
            </p>
          }

          <div class="flex justify-end gap-2">
            <z-button variant="secondary" type="button" (pressed)="cancel()">
              {{ 'common.actions.cancel' | transloco }}
            </z-button>
            <z-button type="submit" [disabled]="store.saveStatus() === 'loading'">
              {{ 'trainingPlans.form.save' | transloco }}
            </z-button>
          </div>
        </form>
      }
    </div>
  `,
})
export class EditTrainingPlanPageComponent {
  protected readonly store = inject(TrainingPlansStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly groupId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly planId = signal<string | null>(this.route.snapshot.paramMap.get('planId'));
  protected readonly isEdit = computed(() => this.planId() !== null);
  protected readonly groupLink = computed(() => `/groups/${this.groupId}`);

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    description: new FormControl('', { nonNullable: true }),
    steps: new FormArray<FormControl<string>>([]),
  });

  constructor() {
    const planId = this.planId();
    if (planId) {
      void this.store.loadPlan(planId).then(() => {
        const plan = this.store.activePlan();
        if (!plan) return;
        this.form.controls.title.setValue(plan.title);
        this.form.controls.description.setValue(plan.description);
        this.form.controls.steps.clear();
        for (const step of plan.steps) {
          this.form.controls.steps.push(this.stepControl(step));
        }
      });
    } else {
      this.addStep();
    }
  }

  private stepControl(value = ''): FormControl<string> {
    return new FormControl(value, { nonNullable: true });
  }

  protected addStep(): void {
    this.form.controls.steps.push(this.stepControl());
  }

  protected removeStep(index: number): void {
    this.form.controls.steps.removeAt(index);
  }

  protected moveStep(index: number, delta: number): void {
    const target = index + delta;
    const steps = this.form.controls.steps;
    if (target < 0 || target >= steps.length) return;
    const control = steps.at(index);
    steps.removeAt(index);
    steps.insert(target, control);
  }

  protected cancel(): void {
    const planId = this.planId();
    void this.router.navigate(
      planId ? ['/groups', this.groupId, 'training-plans', planId] : ['/groups', this.groupId],
    );
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, description, steps } = this.form.getRawValue();
    const payload = {
      title: title.trim(),
      description,
      steps: steps.map((s) => s.trim()).filter((s) => s.length > 0),
    };

    const planId = this.planId();
    const result = planId
      ? await this.store.updatePlan(planId, {
          ...payload,
          archived: this.store.activePlan()?.archived ?? false,
        })
      : await this.store.createPlan(this.groupId, payload);

    if (result) {
      void this.router.navigate(['/groups', this.groupId, 'training-plans', result.id]);
    }
  }
}
```

Before relying on `z-icon-button`'s inputs (`ariaLabel`, `disabled`, `pressed`), open `web/dashboard-next/src/app/shared/ui/icon-button/z-icon-button.component.ts` and confirm the names; adjust if they differ. Same for `z-breadcrumbs` translated labels — check how existing pages pass labels (the upload page passes i18n keys, the component translates).

- [ ] **Step 2: Register the routes**

In `web/dashboard-next/src/app/app.routes.ts`, inside the children array next to the existing `groups/:id` entries, add **before** `groups/:id` (so `new` is not swallowed by a param route — check existing route order; chi-style specificity does not apply, Angular matches in order):

```ts
      {
        path: 'groups/:id/training-plans/new',
        component: EditTrainingPlanPageComponent,
        title: 'Training plan',
      },
      {
        path: 'groups/:id/training-plans/:planId/edit',
        component: EditTrainingPlanPageComponent,
        title: 'Training plan',
      },
      {
        path: 'groups/:id/training-plans/:planId',
        component: TrainingPlanDetailsPageComponent,
        title: 'Training plan',
      },
```

`TrainingPlanDetailsPageComponent` is created in Task 13 — to keep this task compiling, add only the two `EditTrainingPlanPageComponent` routes now and add the details route in Task 13. Add the import:

```ts
import { EditTrainingPlanPageComponent } from './pages/training-plans/edit-training-plan-page.component';
```

- [ ] **Step 3: Verify and commit**

```bash
make web-next:lint
make web-next:build
git add web/dashboard-next/src/app/pages/training-plans/ web/dashboard-next/src/app/app.routes.ts
git commit -m "feat(dashboard): add training plan create/edit page"
```

---

### Task 13: Frontend — plan details page

**Files:**
- Create: `web/dashboard-next/src/app/pages/training-plans/training-plan-details-page.component.ts`
- Modify: `web/dashboard-next/src/app/app.routes.ts`

- [ ] **Step 1: Create the details page**

`training-plan-details-page.component.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideArchive, LucidePencil, LucideUpload } from '@lucide/angular';
import { SessionStore } from '../../features/session/session.store';
import { TrainingPlansStore } from '../../features/training-plans/training-plans.store';
import { VideosStore } from '../../features/videos/videos.store';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-training-plan-details-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideArchive,
    LucidePencil,
    LucideUpload,
  ],
  template: `
    <div class="grid min-w-0 gap-6">
      <z-breadcrumbs
        [items]="[
          { label: 'groups.title', routerLink: '/groups' },
          { label: 'trainingPlans.title', routerLink: '/groups/' + groupId },
          { label: store.activePlan()?.title || '' },
        ]"
      />

      @if (store.detailStatus() === 'loading') {
        <z-skeleton class="block h-40 w-full"></z-skeleton>
        <z-skeleton class="block h-64 w-full"></z-skeleton>
      } @else if (store.activePlan(); as plan) {
        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold sm:text-3xl">{{ plan.title }}</h2>
                @if (plan.archived) {
                  <z-badge tone="neutral">{{ 'trainingPlans.archived' | transloco }}</z-badge>
                }
              </div>
              @if (plan.description) {
                <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">{{ plan.description }}</p>
              }
            </div>
            @if (canManage()) {
              <div class="flex shrink-0 gap-2">
                <z-button
                  variant="secondary"
                  size="sm"
                  [routerLink]="['/groups', groupId, 'training-plans', plan.id, 'edit']"
                >
                  <svg lucidePencil class="size-4" aria-hidden="true"></svg>
                  {{ 'trainingPlans.edit' | transloco }}
                </z-button>
                <z-button variant="secondary" size="sm" (pressed)="toggleArchived()">
                  <svg lucideArchive class="size-4" aria-hidden="true"></svg>
                  {{
                    (plan.archived ? 'trainingPlans.unarchive' : 'trainingPlans.archive')
                      | transloco
                  }}
                </z-button>
              </div>
            }
          </div>

          @if (plan.archived) {
            <p class="rounded-md bg-[var(--z-surface-warm)] p-3 text-sm text-[var(--z-muted)]">
              {{ 'trainingPlans.archivedHint' | transloco }}
            </p>
          }

          @if (plan.steps.length) {
            <ol class="grid gap-2">
              @for (step of plan.steps; track $index) {
                <li class="flex gap-3 rounded-md border border-[var(--z-border)] p-3 text-sm">
                  <span
                    class="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--z-primary-soft)] text-xs font-semibold text-[var(--z-primary-strong)]"
                  >
                    {{ $index + 1 }}
                  </span>
                  <span class="min-w-0 leading-6">{{ step }}</span>
                </li>
              }
            </ol>
          }

          @if (!plan.archived) {
            <div>
              <z-button
                [routerLink]="['/upload-video']"
                [queryParams]="{ groupId: plan.group_id, planId: plan.id }"
              >
                <svg lucideUpload class="size-4" aria-hidden="true"></svg>
                {{ 'trainingPlans.uploadForPlan' | transloco }}
              </z-button>
            </div>
          }
        </section>

        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <h3 class="text-base font-semibold">{{ 'trainingPlans.linkedVideos' | transloco }}</h3>
          @if (videos.status() === 'loading') {
            <div class="grid gap-2 sm:grid-cols-2">
              <z-skeleton class="block h-24 w-full"></z-skeleton>
              <z-skeleton class="block h-24 w-full"></z-skeleton>
            </div>
          } @else if (linkedAssets().length) {
            <div class="grid gap-2 sm:grid-cols-2">
              @for (asset of linkedAssets(); track asset.id) {
                <a
                  [routerLink]="['/asset', asset.id]"
                  class="flex min-w-0 items-center gap-3 rounded-md border border-[var(--z-border)] p-3 transition hover:border-[var(--z-primary-soft)]"
                >
                  @if (asset.thumbnail) {
                    <img
                      [src]="asset.thumbnail"
                      alt=""
                      class="h-14 w-24 shrink-0 rounded object-cover"
                    />
                  }
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold">{{ asset.title }}</span>
                    <span class="block text-xs text-[var(--z-muted)]">{{ asset.status }}</span>
                  </span>
                </a>
              }
            </div>
          } @else {
            <z-empty-state
              [title]="'trainingPlans.noLinkedVideos' | transloco"
              [description]="''"
            />
          }
        </section>
      } @else {
        <z-empty-state
          [title]="'trainingPlans.loadFailed' | transloco"
          [description]="store.detailError() || ''"
        />
      }
    </div>
  `,
})
export class TrainingPlanDetailsPageComponent {
  protected readonly store = inject(TrainingPlansStore);
  protected readonly videos = inject(VideosStore);
  private readonly session = inject(SessionStore);
  private readonly permissions = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly planId = this.route.snapshot.paramMap.get('planId') ?? '';

  protected readonly canManage = computed(
    () =>
      this.permissions.hasPermission('training-plans:edit') &&
      this.store.activePlan()?.owner_id === this.session.user()?.id,
  );

  protected readonly linkedAssets = computed(() =>
    this.videos.assets().filter((asset) => asset.training_plan?.id === this.planId),
  );

  constructor() {
    void this.store.loadPlan(this.planId);
    void this.videos.loadVideos();
  }

  protected toggleArchived(): void {
    const plan = this.store.activePlan();
    if (!plan) return;
    void this.store.updatePlan(plan.id, {
      title: plan.title,
      description: plan.description,
      steps: plan.steps,
      archived: !plan.archived,
    });
  }
}
```

Check `SessionStore` for the exact user accessor (`session.user()?.id` is what `group-details-page.component.ts:349` uses). Check `z-empty-state` and `z-badge` inputs before use.

- [ ] **Step 2: Add the details route**

In `app.routes.ts`, after the two edit routes from Task 12:

```ts
      {
        path: 'groups/:id/training-plans/:planId',
        component: TrainingPlanDetailsPageComponent,
        title: 'Training plan',
      },
```

with import:

```ts
import { TrainingPlanDetailsPageComponent } from './pages/training-plans/training-plan-details-page.component';
```

- [ ] **Step 3: Verify and commit**

```bash
make web-next:lint
make web-next:build
git add web/dashboard-next/src/app/pages/training-plans/ web/dashboard-next/src/app/app.routes.ts
git commit -m "feat(dashboard): add training plan details page"
```

---

### Task 14: Frontend — training plans section on group details

**Files:**
- Create: `web/dashboard-next/src/app/pages/group-details/group-training-plans-section.component.ts`
- Modify: `web/dashboard-next/src/app/pages/group-details/group-details-page.component.ts`

- [ ] **Step 1: Create the section component**

`group-training-plans-section.component.ts`:

```ts
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideClipboardList, LucidePlus } from '@lucide/angular';
import { TrainingPlansStore } from '../../features/training-plans/training-plans.store';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-group-training-plans-section',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideClipboardList,
    LucidePlus,
  ],
  template: `
    <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <svg lucideClipboardList class="size-5 text-[var(--z-primary)]" aria-hidden="true"></svg>
          <h3 class="text-base font-semibold">{{ 'trainingPlans.title' | transloco }}</h3>
          @if (store.status() === 'success') {
            <z-badge tone="neutral">{{ store.plans().length }}</z-badge>
          }
        </div>
        @if (canCreate()) {
          <z-button
            size="sm"
            [routerLink]="['/groups', groupId(), 'training-plans', 'new']"
          >
            <svg lucidePlus class="size-4" aria-hidden="true"></svg>
            {{ 'trainingPlans.create' | transloco }}
          </z-button>
        }
      </div>

      @if (store.status() === 'loading') {
        <div class="grid gap-2">
          <z-skeleton class="block h-16 w-full"></z-skeleton>
          <z-skeleton class="block h-16 w-full"></z-skeleton>
        </div>
      } @else if (store.status() === 'error') {
        <p class="text-sm text-[var(--z-danger)]">
          {{ store.error() || ('trainingPlans.loadFailed' | transloco) }}
        </p>
      } @else if (store.plans().length) {
        <ul class="grid gap-2">
          @for (plan of store.plans(); track plan.id) {
            <li>
              <a
                [routerLink]="['/groups', groupId(), 'training-plans', plan.id]"
                class="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--z-border)] p-3 transition hover:border-[var(--z-primary-soft)]"
                [class.opacity-60]="plan.archived"
              >
                <span class="min-w-0">
                  <span class="flex items-center gap-2">
                    <span class="truncate text-sm font-semibold">{{ plan.title }}</span>
                    @if (plan.archived) {
                      <z-badge tone="neutral">{{ 'trainingPlans.archived' | transloco }}</z-badge>
                    }
                  </span>
                  <span class="mt-0.5 block text-xs text-[var(--z-muted)]">
                    {{ plan.steps.length }} {{ 'trainingPlans.steps' | transloco }} ·
                    {{ plan.asset_count }} {{ 'trainingPlans.videos' | transloco }}
                  </span>
                </span>
              </a>
            </li>
          }
        </ul>
      } @else {
        <z-empty-state
          [title]="'trainingPlans.emptyTitle' | transloco"
          [description]="'trainingPlans.emptyDescription' | transloco"
        />
      }
    </section>
  `,
})
export class GroupTrainingPlansSectionComponent {
  readonly groupId = input.required<string>();
  readonly isOwner = input.required<boolean>();

  protected readonly store = inject(TrainingPlansStore);
  private readonly permissions = inject(PermissionsService);

  protected readonly canCreate = computed(
    () => this.isOwner() && this.permissions.hasPermission('training-plans:create'),
  );

  ngOnInit(): void {
    // input() values are not yet resolved in the constructor; load here instead.
    void this.store.loadPlans(this.groupId());
  }
}
```

Note: declare the class as `export class GroupTrainingPlansSectionComponent implements OnInit` and add `OnInit` to the `@angular/core` import.

- [ ] **Step 2: Embed it in the group details page**

In `group-details-page.component.ts`:
- Add to `imports` array: `GroupTrainingPlansSectionComponent` with `import { GroupTrainingPlansSectionComponent } from './group-training-plans-section.component';`
- In the template, after the group header `</section>` (line ~111) and before the member sections, inside the same `@if` that provides the loaded `group`, add:

```html
        <app-group-training-plans-section
          [groupId]="group.id"
          [isOwner]="isGroupOwner()"
        />
```

- Check whether the component already has an "is owner" helper (search for `owner` in the file). If not, add (the component already injects `SessionStore` as `session`):

```ts
  protected isGroupOwner(): boolean {
    const group = this.store.group?.();
    return !!group && group.owner_id === this.session.user()?.id;
  }
```

Adapt the group accessor to whatever the page actually uses for the loaded group (check the surrounding template — the `@if` binds a `group` variable; use the same source, e.g. pass `group.owner_id === ...` inline if simpler).

- [ ] **Step 3: Keep the existing page spec green**

```bash
make web-next:test
```

If `group-details-page.component.spec.ts` fails because the new child store fires HTTP requests, provide `TrainingPlansApiClient` with a stub (`{ listPlans: () => of([]) }`) in the spec's TestBed providers.

- [ ] **Step 4: Verify and commit**

```bash
make web-next:lint
make web-next:build
git add web/dashboard-next/src/app/pages/group-details/
git commit -m "feat(dashboard): show training plans on group details page"
```

---

### Task 15: Frontend — upload page integration

**Files:**
- Modify: `web/dashboard-next/src/app/pages/upload-video/upload-video-page.component.ts`

- [ ] **Step 1: Wire the store, query params, and form control**

In `upload-video-page.component.ts`:

(a) Add imports:

```ts
import { ActivatedRoute } from '@angular/router';
import { TrainingPlansStore } from '../../features/training-plans/training-plans.store';
```

(b) Add to the class:

```ts
  protected readonly trainingPlans = inject(TrainingPlansStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly planOptions = computed(() =>
    this.trainingPlans.activePlans().map((p) => ({ value: p.id, label: p.title })),
  );
  protected readonly showPlanField = computed(
    () =>
      this.trainingPlans.plansGroupId() === this.form.controls.groupId.value &&
      this.planOptions().length > 0,
  );
```

(c) Add a `planId` control to the form group:

```ts
    planId: new FormControl('', { nonNullable: true }),
```

(d) Extend the constructor to honor query params:

```ts
  constructor() {
    if (this.groups.status() === 'idle') {
      void this.groups.loadGroups();
    }
    const params = this.route.snapshot.queryParamMap;
    const groupId = params.get('groupId');
    const planId = params.get('planId');
    if (groupId) {
      this.form.controls.groupId.setValue(groupId);
      void this.trainingPlans.loadPlans(groupId);
      if (planId) {
        this.form.controls.planId.setValue(planId);
      }
    }
  }
```

(e) Reload plans and reset the selection when the group changes — extend `setGroup`:

```ts
  protected setGroup(groupId: string): void {
    this.form.controls.groupId.setValue(groupId);
    this.form.controls.groupId.markAsDirty();
    this.form.controls.planId.setValue('');
    if (groupId) {
      void this.trainingPlans.loadPlans(groupId);
    }
  }
```

(f) Send the plan with the asset — in `startUpload()` change the destructure and payload:

```ts
    const { title, description, groupId, planId } = this.form.getRawValue();
```

```ts
      .createAsset({
        title,
        description,
        filenames: files.map((f) => f.name),
        group_id: groupId || undefined,
        training_plan_id: planId || undefined,
      })
```

- [ ] **Step 2: Add the optional combobox to the details step**

In the template, after the group `<div class="grid gap-2">…</div>` block (the one ending with the `upload-group-error` field error) and before the back/next button row:

```html
          @if (showPlanField()) {
            <div class="grid gap-2">
              <z-field-label
                [label]="'trainingPlans.optionalPlanLabel' | transloco"
                [control]="form.controls.planId"
              />
              <z-combobox
                [label]="'trainingPlans.searchPlans' | transloco"
                [toggleLabel]="'trainingPlans.togglePlans' | transloco"
                [noOptionsLabel]="'trainingPlans.noPlansAvailable' | transloco"
                [value]="form.controls.planId.value || undefined"
                [options]="planOptions()"
                [placeholder]="'trainingPlans.choosePlan' | transloco"
                (valueChange)="form.controls.planId.setValue($event)"
              />
            </div>
          }
```

- [ ] **Step 3: Show the chosen plan in the review step**

In the review-step summary `<div class="grid gap-2 rounded-md ...">`, after the group line:

```html
              @if (selectedPlanTitle()) {
                <p>
                  <strong>{{ 'trainingPlans.planLabel' | transloco }}:</strong>
                  {{ selectedPlanTitle() }}
                </p>
              }
```

And in the class:

```ts
  protected selectedPlanTitle(): string {
    return (
      this.trainingPlans.plans().find((p) => p.id === this.form.controls.planId.value)?.title || ''
    );
  }
```

- [ ] **Step 4: Verify and commit**

```bash
make web-next:lint
make web-next:build
make web-next:test
git add web/dashboard-next/src/app/pages/upload-video/
git commit -m "feat(dashboard): link uploads to a training plan"
```

---

### Task 16: Frontend — plan badge on video details

**Files:**
- Modify: `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`

- [ ] **Step 1: Add the badge**

Open the file and find where the asset header renders group info (search for `group` in the template). Next to it, add a clickable plan badge (adapt the wrapper markup to the surroundings):

```html
        @if (store.activeAsset()?.training_plan; as plan) {
          <a
            [routerLink]="[
              '/groups',
              store.activeAsset()?.group?.id,
              'training-plans',
              plan.id,
            ]"
            class="inline-flex"
          >
            <z-badge>{{ 'trainingPlans.planLabel' | transloco }}: {{ plan.title }}</z-badge>
          </a>
        }
```

Ensure `ZBadgeComponent`, `RouterLink`, and `TranslocoPipe` are in the component's `imports` (they likely already are — verify). If the asset's group can be absent, render the badge without the link in an `@else` branch:

```html
        @if (store.activeAsset()?.training_plan; as plan) {
          @if (store.activeAsset()?.group?.id) {
            <!-- linked badge as above -->
          } @else {
            <z-badge>{{ 'trainingPlans.planLabel' | transloco }}: {{ plan.title }}</z-badge>
          }
        }
```

- [ ] **Step 2: Verify and commit**

```bash
make web-next:lint
make web-next:build
git add web/dashboard-next/src/app/pages/video-details/
git commit -m "feat(dashboard): show training plan badge on video details"
```

---

### Task 17: Full verification + completion report

- [ ] **Step 1: Run the full verification suite**

```bash
make api:build
make test:unit
make web-next:lint
make web-next:build
make web-next:test
```

Expected: all green. Integration tests (`make test:integration`) need local infra; run them if the environment is up (`make infra:restart` first if needed).

- [ ] **Step 2: Manual smoke test (if local infra available)**

Apply migrations per the project's usual flow, start API + dashboard, then: create a plan as expert → see it as rider in the group → upload a video with the plan preselected via the detail-page CTA → confirm the plan badge on the video details page and the video on the plan detail page.

- [ ] **Step 3: Write the completion report**

Create `.agents/reports/<YYYYMMDDHHMMSS>_training_plans_v1_implementation.md` (current timestamp) with: context (link to spec + this plan), files touched, verification results, and follow-ups — including the **manual WorkOS step**: assign `training-plans:create`/`training-plans:edit` to role `expert` and `training-plans:read` to `expert` + `student`; users must re-login.

- [ ] **Step 4: Commit**

```bash
git add .agents/reports/
git commit -m "docs(reports): training plans v1 completion report"
```

---

## Out of scope (do not build)

Score/grades, per-rider status tracking, plan templates/duplication across groups, TTS read-aloud, file attachments, plan deletion. The review flow (`video_reviews`, finalize) is intentionally untouched.
