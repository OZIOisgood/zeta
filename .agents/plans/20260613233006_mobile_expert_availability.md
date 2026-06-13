# Mobile Expert Availability Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan. Each task is one self-contained action: write the failing test (REAL code) → run it and see it FAIL → write the minimal implementation (REAL code) → run it and see it PASS → commit. Steps use checkbox (`- [ ]`) syntax. Do not batch tasks; do not skip the red phase.

**Goal:** Give an expert the availability-management surface that exists on the web (`pages/manage-availability`) but is absent on mobile. An expert can manage, **per group**, three things behind one screen: **session types** (name + description + duration, CRUD), a **weekly schedule** of availability blocks (day-of-week + start/end time, CRUD), and **blocked dates** (a date with optional time window + optional reason, create/delete). This closes the last expert-authoring gap before release. It also adds the two entry points the web has: a "Manage availability" affordance for experts and the home onboarding step ("Set coaching availability").

**Architecture (Shape S — backend already exists):** The Go backend is fully implemented and verified in `internal/coaching/handler.go` (routes), `session_types.go`, `availability.go`, `blocked_slots.go`. All write routes are gated by `coaching:availability:manage`; the read route for session-types is dual-gated (`coaching:availability:manage` returns the expert's own types, `coaching:slots:read` returns all active group types). **No new backend code.** Work is: (1) surface the six missing endpoints into `docs/openapi.yaml` matching the Go handlers exactly, (2) regenerate the mobile typed client, (3) add hooks in `mobile/src/api/queries/coaching.ts` mirroring the existing injectable-client + throw-on-error pattern, (4) build one form/wizard screen `mobile/src/app/availability.tsx` gated on `coaching:availability:manage`, (5) wire the two entry points, (6) verify i18n keys (they already exist in the synced JSONs) and run tests.

**Tech Stack:** Go 1.x + chi + sqlc + pgx (backend, untouched). `docs/openapi.yaml` (OpenAPI 3) → `openapi-typescript` → `mobile/src/api/schema.d.ts`. Mobile: Expo SDK 56 / React Native, expo-router, `openapi-fetch` typed client (`api` from `mobile/src/auth/auth-store`), TanStack Query v5, NativeWind (Zeta `z-*` tokens), i18next (synced Transloco JSONs), jest-expo + React Native Testing Library.

**Web reference (read before screen work):** `web/dashboard-next/src/app/pages/manage-availability/manage-availability-page.component.ts` and `web/dashboard-next/src/app/core/http/coaching-api.service.ts`. The web page is a single page with a `z-tabs` switch (session-types / schedule / blocked) where each item is a bordered `<article>` row with edit/delete icon-buttons, and each create/edit opens a `z-form-dialog` containing the fields. The mobile equivalent keeps the same three sections and the same fields, but follows the mobile header rule (form/wizard → header card + `ZTabs`, not the web header-card verbatim) and uses inline add/edit sheets rather than a desktop modal grid.

> **Depends on:** WP-UI0 (`.agents/plans/20260613233000_mobile_shared_ui_foundation.md`). This screen is a pushed/detail route, so it MUST use the shared **`ZBackHeader`** (NOT a local `Header()` and NOT `ZPageHeader` — that primitive is reserved for the 5 tab index screens). The blocked-slot glyph and the row tiles MUST use the shared **`ZIconTile`** (z-tokens only, never raw Tailwind palette). Relative/absolute date display MUST go through the shared **datetime helper** (`mobile/src/lib/datetime.ts`) — no per-screen `toLocaleDateString` formatter. Do not start B-T3 until WP-UI0 has landed `ZBackHeader`, `ZIconTile`, and `mobile/src/lib/datetime.ts` in the working tree.

---

## Constraints (state in every task)

- **Single PR #15**, branch `feat/mobile-token-auth`. Commit locally per task. **Do not push.**
- **Shared working tree.** Phase A (contract + hooks) touches only `docs/openapi.yaml`, `mobile/src/api/schema.d.ts`, and `mobile/src/api/queries/coaching.ts` (+ its test) — collision-free, execute now. Phase B (screen + entry points + home step) touches `mobile/src/app/availability.tsx` (new), `mobile/src/app/(tabs)/coaching.tsx`, `mobile/src/app/(tabs)/index.tsx` — these overlap the parallel screen-touching session, so **gate Phase B on the parallel session signalling done.**
- **No shared-DB migration** (no schema change in this package).
- **WSL tooling.** Wrap every command: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && <cmd>"`.
- `asset == video` in API/DB; say "video" in UI copy. (Not directly relevant here — no asset surface in this package.)

---

## FILE STRUCTURE

**Created**
- `mobile/src/app/availability.tsx` — the expert availability-management screen (pushed route: shared `ZBackHeader` + header summary card + `ZTabs` for the three sections, inline add/edit sheets, delete via `ZConfirmDialog`). Route `/availability`. Self-gates on `coaching:availability:manage`. **Depends on WP-UI0** for `ZBackHeader`, `ZIconTile`, and the `datetime` helper.
- `mobile/src/components/session-type-row.tsx` — NEW domain component: one session-type list row (name + duration badge + description + edit/delete icon-buttons). Mobile counterpart of the web session-type `<article>` (`manage-availability-page.component.ts` `@case ('session-types')`). Composes `ZCard` + `ZBadge` + `ZIconButton`.
- `mobile/src/components/schedule-day-row.tsx` — NEW domain component: one weekly-schedule list row (weekday name + "start – end" + edit/delete icon-buttons). Mobile counterpart of the web schedule `<article>` (`@case ('schedule')`). Composes `ZCard` + `ZIconButton`.
- `mobile/src/components/session-type-row.test.tsx` — render test for the session-type row.
- `mobile/src/components/schedule-day-row.test.tsx` — render test for the schedule-day row.
- `mobile/src/__tests__/availability-screen.test.tsx` — screen render/states test (no test file under `src/app/` — expo-router would route it).

**Modified**
- `docs/openapi.yaml` — add 6 operations + 3 schemas (session-types create/update/delete, availability list/create/update/delete, blocked-slots list/create/delete). One responsibility: be the byte-accurate contract for the existing handlers.
- `mobile/src/api/schema.d.ts` — regenerated (never hand-edited). One responsibility: typed client surface.
- `mobile/src/api/queries/coaching.ts` — add the availability hooks (list + mutations for the three resources). One responsibility: typed, injectable React-Query hooks with correct invalidation.
- `mobile/src/api/queries/coaching.test.tsx` — add hook tests next to the existing ones.
- `mobile/src/app/(tabs)/coaching.tsx` — add a `coaching:availability:manage`-gated header overflow action (`ZIconButton`, calendar-cog icon) routing to `/availability`. The primary create FAB (`coaching:book` → `/book`) is unchanged; availability is a *config* action, so it is a header action, not the FAB (per the mobile header rule).
- `mobile/src/app/(tabs)/index.tsx` — add the 5th home first-step (`coaching:availability:manage`-gated) reusing `FirstStepRow`, completing when the expert has at least one availability block in their first group.
- `mobile/src/i18n/locales/{en,de,fr}.json` — verify `sessions.availability.*` + `weekdays.*` + `home.firstSteps.setAvailability*` exist (they do); add only the handful of new mobile-screen keys (header title, tab counts already use existing labels, toast messages). Add to the **web JSON source** first, then `sync:i18n`.

---

## Endpoint inventory (verified against the Go handlers)

All paths are under `/groups/{groupID}/coaching`. `groupID` is a path uuid. Group membership is enforced by middleware on the whole subtree; the per-route permission is `coaching:availability:manage` for every write and for the list-session-types-as-expert path.

| Method | Path | operationId | Perm | Body | Success | Notes |
|---|---|---|---|---|---|---|
| POST | `/session-types` | `createSessionType` | availability:manage | `CreateSessionTypeRequest` | **201** `SessionType` | `name` required; `duration_minutes` 15–120 step 5 (else 400) |
| PUT | `/session-types/{sessionTypeID}` | `updateSessionType` | availability:manage | `CreateSessionTypeRequest` | 200 `SessionType` | 404 if not owned |
| DELETE | `/session-types/{sessionTypeID}` | `deactivateSessionType` | availability:manage | — | **204** | soft delete (deactivate); 404 if not owned |
| GET | `/availability` | `listMyAvailability` | availability:manage | — | 200 `CoachingAvailability[]` | expert's own blocks |
| POST | `/availability` | `createAvailability` | availability:manage | `AvailabilityRequest` | **201** `CoachingAvailability[]` | merges overlapping blocks → returns the **full list** |
| PUT | `/availability/{availabilityID}` | `updateAvailability` | availability:manage | `AvailabilityRequest` | 200 `CoachingAvailability[]` | merges → returns **full list**; 404 if not owned |
| DELETE | `/availability/{availabilityID}` | `deleteAvailability` | availability:manage | — | **204** | 404 if not owned |
| GET | `/blocked-slots` | `listBlockedSlots` | availability:manage | — | 200 `CoachingBlockedSlot[]` | next 3 months only (server-bounded) |
| POST | `/blocked-slots` | `createBlockedSlot` | availability:manage | `CreateBlockedSlotRequest` | **201** `CoachingBlockedSlot` | start/end both-or-neither; reason optional |
| DELETE | `/blocked-slots/{slotID}` | `deleteBlockedSlot` | availability:manage | — | **204** | 404 if not owned |

`GET /session-types` (operationId `listGroupSessionTypes`) **already exists** in `docs/openapi.yaml` (line ~567) — do NOT re-add it; the screen reuses the existing `useSessionTypesQuery` for the read, BUT note that hook filters `is_active`, which is what we want for the manage screen too (deactivated types disappear). **Critical subtlety:** the existing `useSessionTypesQuery` keys on `['coaching', groupId, 'session-types']` and filters active. Our create/update/deactivate mutations must invalidate that exact key.

⚠️ **Response-shape subtlety — availability create/update returns an ARRAY (the merged full list), not a single object.** The Go handlers (`availability.go` `CreateAvailability`/`UpdateAvailability`) re-merge overlapping blocks for the day and return `[]availabilityResponse`. The web models this as `CoachingAvailabilityResponse = CoachingAvailability | CoachingAvailability[]` (it tolerates both because the non-fatal merge-failure path returns a single object). To keep the mobile contract honest and the hook simple, the contract documents the 201/200 body as `CoachingAvailability[]` (the normal path) and the hook re-fetches the list via invalidation rather than trusting the return shape — so a single-object fallback never corrupts the cache.

---

## Phase A — Contract + hooks (collision-free, execute now)

### A-T1 — Contract: session-type write operations

**Files:** `docs/openapi.yaml`

- [ ] Open `docs/openapi.yaml`. Find the existing path item `/groups/{groupID}/coaching/session-types:` (line ~567, currently only `get: listGroupSessionTypes`). Add `post`, and add a sibling path item `/groups/{groupID}/coaching/session-types/{sessionTypeID}:` with `put` + `delete`. Use exactly:

```yaml
  /groups/{groupID}/coaching/session-types:
    get:
      # ... existing listGroupSessionTypes get is unchanged — keep it ...
    post:
      tags: [coaching]
      summary: Create a coaching session type
      description: >
        Creates a session type owned by the calling expert in the given group.
        Requires group membership and coaching:availability:manage. name is
        required; duration_minutes must be between 15 and 120 in 5-minute
        increments.
      operationId: createSessionType
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateSessionTypeRequest"
      responses:
        "201":
          description: Session type created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionType"
        "400":
          description: Missing name or invalid duration_minutes
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "500":
          description: Failed to create session type

  /groups/{groupID}/coaching/session-types/{sessionTypeID}:
    put:
      tags: [coaching]
      summary: Update a coaching session type
      description: >
        Updates a session type owned by the calling expert. Requires group
        membership and coaching:availability:manage. Same validation as create.
      operationId: updateSessionType
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: sessionTypeID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateSessionTypeRequest"
      responses:
        "200":
          description: Session type updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionType"
        "400":
          description: Invalid ID, missing name, or invalid duration_minutes
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "404":
          description: Session type not found or not owned by caller
        "500":
          description: Failed to update session type
    delete:
      tags: [coaching]
      summary: Deactivate a coaching session type
      description: >
        Soft-deletes (deactivates) a session type owned by the calling expert.
        Requires group membership and coaching:availability:manage.
      operationId: deactivateSessionType
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: sessionTypeID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Session type deactivated
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "404":
          description: Session type not found or not owned by caller
        "500":
          description: Failed to deactivate session type
```

- [ ] In `components.schemas`, beside `SessionType` (line ~1426), add:

```yaml
    CreateSessionTypeRequest:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        duration_minutes:
          type: integer
          format: int32
          description: Between 15 and 120 in 5-minute increments
      required:
        - name
        - duration_minutes
```

- [ ] Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"`. Expect **0 errors**. (Do NOT regenerate the mobile schema yet — that happens once in A-T4 after all contract tasks.)
- [ ] Commit: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add docs/openapi.yaml && git commit -m 'feat(coaching): add session-type write ops to mobile contract'"`

### A-T2 — Contract: availability list + write operations

**Files:** `docs/openapi.yaml`

- [ ] Add a new path item `/groups/{groupID}/coaching/availability:` (after the session-types block) with `get` + `post`, and `/groups/{groupID}/coaching/availability/{availabilityID}:` with `put` + `delete`. Use exactly:

```yaml
  /groups/{groupID}/coaching/availability:
    get:
      tags: [coaching]
      summary: List the calling expert's weekly availability for a group
      description: >
        Returns the calling expert's active availability blocks in the group.
        Requires group membership and coaching:availability:manage.
      operationId: listMyAvailability
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: The expert's availability blocks
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/CoachingAvailability"
        "400":
          description: Invalid group ID
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "500":
          description: Failed to list availability
    post:
      tags: [coaching]
      summary: Add a weekly availability block
      description: >
        Adds a recurring weekly availability block (day_of_week 0-6, start_time
        before end_time, HH:MM). Overlapping or adjacent blocks for the same day
        are merged server-side, so the response is the full merged list for the
        expert in this group. Requires coaching:availability:manage.
      operationId: createAvailability
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AvailabilityRequest"
      responses:
        "201":
          description: Availability created; full merged list returned
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/CoachingAvailability"
        "400":
          description: Invalid day_of_week or time range
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "500":
          description: Failed to create availability

  /groups/{groupID}/coaching/availability/{availabilityID}:
    put:
      tags: [coaching]
      summary: Update a weekly availability block
      description: >
        Updates an availability block owned by the calling expert. Overlapping
        blocks are re-merged, so the response is the full merged list. Requires
        coaching:availability:manage.
      operationId: updateAvailability
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: availabilityID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AvailabilityRequest"
      responses:
        "200":
          description: Availability updated; full merged list returned
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/CoachingAvailability"
        "400":
          description: Invalid ID or time range
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "404":
          description: Availability not found or not owned by caller
        "500":
          description: Failed to update availability
    delete:
      tags: [coaching]
      summary: Delete a weekly availability block
      description: >
        Deletes an availability block owned by the calling expert. Requires
        coaching:availability:manage.
      operationId: deleteAvailability
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: availabilityID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Availability deleted
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "404":
          description: Availability not found or not owned by caller
        "500":
          description: Failed to delete availability
```

- [ ] In `components.schemas`, add `CoachingAvailability` and `AvailabilityRequest` (mirroring `availability.go` `availabilityResponse` / `availabilityRequest`):

```yaml
    CoachingAvailability:
      type: object
      properties:
        id:
          type: string
          format: uuid
        expert_id:
          type: string
        group_id:
          type: string
          format: uuid
        day_of_week:
          type: integer
          description: 0 = Sunday … 6 = Saturday
        start_time:
          type: string
          description: HH:MM (24-hour)
        end_time:
          type: string
          description: HH:MM (24-hour)
        is_active:
          type: boolean
        created_at:
          type: string
          format: date-time
      required:
        - id
        - expert_id
        - group_id
        - day_of_week
        - start_time
        - end_time
        - is_active
        - created_at

    AvailabilityRequest:
      type: object
      properties:
        day_of_week:
          type: integer
          description: 0 = Sunday … 6 = Saturday
        start_time:
          type: string
          description: HH:MM (24-hour)
        end_time:
          type: string
          description: HH:MM (24-hour)
      required:
        - day_of_week
        - start_time
        - end_time
```

- [ ] Run `make api:openapi:lint` (0 errors).
- [ ] Commit: `... git add docs/openapi.yaml && git commit -m 'feat(coaching): add availability CRUD to mobile contract'`

### A-T3 — Contract: blocked-slots list + create + delete

**Files:** `docs/openapi.yaml`

- [ ] Add `/groups/{groupID}/coaching/blocked-slots:` (`get` + `post`) and `/groups/{groupID}/coaching/blocked-slots/{slotID}:` (`delete`):

```yaml
  /groups/{groupID}/coaching/blocked-slots:
    get:
      tags: [coaching]
      summary: List the calling expert's blocked dates for a group
      description: >
        Returns the calling expert's blocked slots over the next three months
        (server-bounded). Requires group membership and
        coaching:availability:manage.
      operationId: listBlockedSlots
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: The expert's blocked slots
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/CoachingBlockedSlot"
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "500":
          description: Failed to list blocked slots
    post:
      tags: [coaching]
      summary: Block a date (optionally a time window) for a group
      description: >
        Blocks a calendar date for the calling expert. start_time and end_time
        must be both present or both absent (HH:MM); when present start_time
        must precede end_time. reason is optional. Requires
        coaching:availability:manage.
      operationId: createBlockedSlot
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateBlockedSlotRequest"
      responses:
        "201":
          description: Blocked slot created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CoachingBlockedSlot"
        "400":
          description: Invalid blocked_date, time window, or range
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "500":
          description: Failed to create blocked slot

  /groups/{groupID}/coaching/blocked-slots/{slotID}:
    delete:
      tags: [coaching]
      summary: Remove a blocked date
      description: >
        Deletes a blocked slot owned by the calling expert. Requires
        coaching:availability:manage.
      operationId: deleteBlockedSlot
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: slotID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Blocked slot deleted
        "401":
          description: Not authenticated
        "403":
          description: Not a group member or missing coaching:availability:manage
        "404":
          description: Blocked slot not found or not owned by caller
        "500":
          description: Failed to delete blocked slot
```

- [ ] In `components.schemas`, add `CoachingBlockedSlot` and `CreateBlockedSlotRequest` (mirroring `blocked_slots.go` `blockedSlotResponse` / `createBlockedSlotRequest` — note `start_time`/`end_time`/`reason` are nullable/optional):

```yaml
    CoachingBlockedSlot:
      type: object
      properties:
        id:
          type: string
          format: uuid
        expert_id:
          type: string
        blocked_date:
          type: string
          description: YYYY-MM-DD
        start_time:
          type: string
          description: HH:MM (24-hour); omitted for a full-day block
        end_time:
          type: string
          description: HH:MM (24-hour); omitted for a full-day block
        reason:
          type: string
        created_at:
          type: string
          format: date-time
      required:
        - id
        - expert_id
        - blocked_date
        - created_at

    CreateBlockedSlotRequest:
      type: object
      properties:
        blocked_date:
          type: string
          description: YYYY-MM-DD
        start_time:
          type: string
          description: HH:MM; both start_time and end_time, or neither
        end_time:
          type: string
          description: HH:MM; both start_time and end_time, or neither
        reason:
          type: string
      required:
        - blocked_date
```

- [ ] Run `make api:openapi:lint` (0 errors).
- [ ] Commit: `... git add docs/openapi.yaml && git commit -m 'feat(coaching): add blocked-slot CRUD to mobile contract'`

### A-T4 — Regenerate the typed client

**Files:** `mobile/src/api/schema.d.ts` (generated — do not hand-edit)

- [ ] Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run generate:api"`
- [ ] Confirm the file now exposes the new operations. Check with: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -nE 'createSessionType|updateSessionType|deactivateSessionType|listMyAvailability|createAvailability|deleteAvailability|listBlockedSlots|createBlockedSlot|deleteBlockedSlot|CreateSessionTypeRequest|AvailabilityRequest|CoachingBlockedSlot|CreateBlockedSlotRequest|CoachingAvailability' mobile/src/api/schema.d.ts"`. Expect every name to appear.
- [ ] Idempotency check: run `pnpm --dir mobile run generate:api` again and `git diff --stat mobile/src/api/schema.d.ts` — expect no further change.
- [ ] Commit: `... git add mobile/src/api/schema.d.ts && git commit -m 'chore(mobile): regenerate api schema for availability ops'`

### A-T5 — Hook: useMyAvailabilityQuery + useBlockedSlotsQuery (the two new reads)

**Files:** `mobile/src/api/queries/coaching.ts`, `mobile/src/api/queries/coaching.test.tsx`

Write the failing test first. The existing test file already has the harness (`wrapper`, `beforeEach`, the `expo-secure-store` mock) and constants `EXPERT`, `SESSION_TYPE_ACTIVE`. Add to its import block the new hook names, and append these constants + tests.

- [ ] In `coaching.test.tsx`, extend the import from `./coaching` to also include `useMyAvailabilityQuery, useBlockedSlotsQuery`. Add constants and tests:

```tsx
const AVAILABILITY = {
  id: 'a1',
  expert_id: 'e1',
  group_id: 'g1',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

const BLOCKED = {
  id: 'bs1',
  expert_id: 'e1',
  blocked_date: '2026-07-04',
  start_time: '12:00',
  end_time: '13:00',
  reason: 'Lunch',
  created_at: '2026-06-01T00:00:00Z',
};

test('useMyAvailabilityQuery fetches availability for a group', async () => {
  const GET = jest.fn(async () => ({ data: [AVAILABILITY], error: undefined }));
  const { result } = await renderHook(
    () => useMyAvailabilityQuery('g1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([AVAILABILITY]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability', {
    params: { path: { groupID: 'g1' } },
  });
});

test('useMyAvailabilityQuery is disabled when groupId is empty', async () => {
  const GET = jest.fn();
  const { result } = await renderHook(
    () => useMyAvailabilityQuery('', { GET } as never),
    { wrapper },
  );
  expect(GET).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

test('useBlockedSlotsQuery fetches blocked slots for a group', async () => {
  const GET = jest.fn(async () => ({ data: [BLOCKED], error: undefined }));
  const { result } = await renderHook(
    () => useBlockedSlotsQuery('g1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([BLOCKED]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/blocked-slots', {
    params: { path: { groupID: 'g1' } },
  });
});
```

- [ ] Run and expect FAIL: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/coaching.test.tsx"`. Expected output: `Cannot find name 'useMyAvailabilityQuery'` / `useBlockedSlotsQuery` (TS) and the suite fails to compile.
- [ ] Implement in `coaching.ts`. Add the exported types and two query hooks (mirror `useSessionTypesQuery`'s injectable `Fetcher`, `enabled: groupId !== ''`, throw on error||!data):

```ts
export type CoachingAvailability = components['schemas']['CoachingAvailability'];
export type CoachingBlockedSlot = components['schemas']['CoachingBlockedSlot'];

export function useMyAvailabilityQuery(groupId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['coaching', groupId, 'availability'],
    enabled: groupId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/availability',
        { params: { path: { groupID: groupId } } },
      );
      if (error || !data) throw new Error('Failed to load availability');
      return data;
    },
  });
}

export function useBlockedSlotsQuery(groupId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['coaching', groupId, 'blocked-slots'],
    enabled: groupId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/blocked-slots',
        { params: { path: { groupID: groupId } } },
      );
      if (error || !data) throw new Error('Failed to load blocked slots');
      return data;
    },
  });
}
```

- [ ] Run and expect PASS (only run the one file — the parallel session has in-flight screen files): `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/coaching.test.tsx"`.
- [ ] Commit: `... git add mobile/src/api/queries/coaching.ts mobile/src/api/queries/coaching.test.tsx && git commit -m 'feat(coaching): availability + blocked-slot read hooks'`

### A-T6 — Hook: session-type mutations (create / update / deactivate)

**Files:** `mobile/src/api/queries/coaching.ts`, `mobile/src/api/queries/coaching.test.tsx`

- [ ] In `coaching.test.tsx`, extend the import with `useCreateSessionTypeMutation, useUpdateSessionTypeMutation, useDeactivateSessionTypeMutation` and add:

```tsx
test('useCreateSessionTypeMutation posts the body and invalidates session-types', async () => {
  const POST = jest.fn(async () => ({ data: SESSION_TYPE_ACTIVE, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useCreateSessionTypeMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const body = { name: '60-min session', description: 'Standard session', duration_minutes: 60 };
  const out = await result.current.mutateAsync(body);
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types', {
    params: { path: { groupID: 'g1' } },
    body,
  });
  expect(out).toEqual(SESSION_TYPE_ACTIVE);
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'session-types'] }),
    ]),
  );
});

test('useCreateSessionTypeMutation does not invalidate on error', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useCreateSessionTypeMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  await expect(
    result.current.mutateAsync({ name: 'x', description: '', duration_minutes: 60 }),
  ).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useUpdateSessionTypeMutation puts the body for the given id', async () => {
  const PUT = jest.fn(async () => ({ data: SESSION_TYPE_ACTIVE, error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useUpdateSessionTypeMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const body = { name: '60-min session', description: 'Standard session', duration_minutes: 60 };
  await result.current.mutateAsync({ sessionTypeId: 'st1', body });
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types/{sessionTypeID}', {
    params: { path: { groupID: 'g1', sessionTypeID: 'st1' } },
    body,
  });
});

test('useDeactivateSessionTypeMutation deletes by id and invalidates', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useDeactivateSessionTypeMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync('st1');
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types/{sessionTypeID}', {
    params: { path: { groupID: 'g1', sessionTypeID: 'st1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'session-types'] }),
    ]),
  );
});
```

- [ ] Run and expect FAIL (`Cannot find name 'useCreateSessionTypeMutation'`).
- [ ] Implement in `coaching.ts`. Add a `Deleter` type alias next to `Putter` if missing, the input types, and the three hooks (DELETE returns no body → treat `error === undefined` as success, like `useLeaveGroupMutation`):

```ts
type Deleter = Pick<typeof api, 'DELETE'>;

export type SessionTypeInput = components['schemas']['CreateSessionTypeRequest'];

export type UpdateSessionTypeInput = {
  sessionTypeId: string;
  body: SessionTypeInput;
};

export function useCreateSessionTypeMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (body: SessionTypeInput) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/session-types',
        { params: { path: { groupID: groupId } }, body },
      );
      if (error || !data) throw new Error('Failed to create session type');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'session-types'] });
    },
  });
}

export function useUpdateSessionTypeMutation(
  groupId: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: UpdateSessionTypeInput) => {
      const { data, error } = await (client as typeof api).PUT(
        '/groups/{groupID}/coaching/session-types/{sessionTypeID}',
        {
          params: { path: { groupID: groupId, sessionTypeID: input.sessionTypeId } },
          body: input.body,
        },
      );
      if (error || !data) throw new Error('Failed to update session type');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'session-types'] });
    },
  });
}

export function useDeactivateSessionTypeMutation(
  groupId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (sessionTypeId: string) => {
      const { error } = await (client as typeof api).DELETE(
        '/groups/{groupID}/coaching/session-types/{sessionTypeID}',
        { params: { path: { groupID: groupId, sessionTypeID: sessionTypeId } } },
      );
      if (error !== undefined) throw new Error('Failed to deactivate session type');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'session-types'] });
    },
  });
}
```

> Note: `Poster`, `Putter`, `Invalidator` already exist in `coaching.ts` (used by booking hooks); only `Deleter` is new — add it if absent.

- [ ] Run and expect PASS: `pnpm --dir mobile jest src/api/queries/coaching.test.tsx`.
- [ ] Commit: `... git commit -m 'feat(coaching): session-type create/update/deactivate hooks'`

### A-T7 — Hook: availability mutations (create / update / delete)

**Files:** `mobile/src/api/queries/coaching.ts`, `mobile/src/api/queries/coaching.test.tsx`

The merge behaviour means create/update return the **full list**. The hooks invalidate `['coaching', groupId, 'availability']` (so the screen re-reads the merged list) AND `['coaching', groupId, 'slots']` (availability changes change bookable slots).

- [ ] In `coaching.test.tsx`, extend the import with `useCreateAvailabilityMutation, useUpdateAvailabilityMutation, useDeleteAvailabilityMutation` and add:

```tsx
test('useCreateAvailabilityMutation posts and invalidates availability + slots', async () => {
  const POST = jest.fn(async () => ({ data: [AVAILABILITY], error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useCreateAvailabilityMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const body = { day_of_week: 1, start_time: '09:00', end_time: '17:00' };
  await result.current.mutateAsync(body);
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability', {
    params: { path: { groupID: 'g1' } },
    body,
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'availability'] }),
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'slots'] }),
    ]),
  );
});

test('useUpdateAvailabilityMutation puts the body for the given id', async () => {
  const PUT = jest.fn(async () => ({ data: [AVAILABILITY], error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useUpdateAvailabilityMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const body = { day_of_week: 2, start_time: '10:00', end_time: '12:00' };
  await result.current.mutateAsync({ availabilityId: 'a1', body });
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability/{availabilityID}', {
    params: { path: { groupID: 'g1', availabilityID: 'a1' } },
    body,
  });
});

test('useDeleteAvailabilityMutation deletes by id', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useDeleteAvailabilityMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync('a1');
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability/{availabilityID}', {
    params: { path: { groupID: 'g1', availabilityID: 'a1' } },
  });
});
```

- [ ] Run and expect FAIL.
- [ ] Implement in `coaching.ts`:

```ts
export type AvailabilityInput = components['schemas']['AvailabilityRequest'];

export type UpdateAvailabilityInput = {
  availabilityId: string;
  body: AvailabilityInput;
};

export function useCreateAvailabilityMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (body: AvailabilityInput) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/availability',
        { params: { path: { groupID: groupId } }, body },
      );
      if (error || !data) throw new Error('Failed to create availability');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'availability'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useUpdateAvailabilityMutation(
  groupId: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: UpdateAvailabilityInput) => {
      const { data, error } = await (client as typeof api).PUT(
        '/groups/{groupID}/coaching/availability/{availabilityID}',
        {
          params: { path: { groupID: groupId, availabilityID: input.availabilityId } },
          body: input.body,
        },
      );
      if (error || !data) throw new Error('Failed to update availability');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'availability'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useDeleteAvailabilityMutation(
  groupId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await (client as typeof api).DELETE(
        '/groups/{groupID}/coaching/availability/{availabilityID}',
        { params: { path: { groupID: groupId, availabilityID: availabilityId } } },
      );
      if (error !== undefined) throw new Error('Failed to delete availability');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'availability'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}
```

- [ ] Run and expect PASS.
- [ ] Commit: `... git commit -m 'feat(coaching): availability create/update/delete hooks'`

### A-T8 — Hook: blocked-slot mutations (create / delete)

**Files:** `mobile/src/api/queries/coaching.ts`, `mobile/src/api/queries/coaching.test.tsx`

- [ ] In `coaching.test.tsx`, extend the import with `useCreateBlockedSlotMutation, useDeleteBlockedSlotMutation` and add:

```tsx
test('useCreateBlockedSlotMutation posts and invalidates blocked-slots + slots', async () => {
  const POST = jest.fn(async () => ({ data: BLOCKED, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useCreateBlockedSlotMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const body = { blocked_date: '2026-07-04', start_time: '12:00', end_time: '13:00', reason: 'Lunch' };
  await result.current.mutateAsync(body);
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/blocked-slots', {
    params: { path: { groupID: 'g1' } },
    body,
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'blocked-slots'] }),
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'slots'] }),
    ]),
  );
});

test('useDeleteBlockedSlotMutation deletes by id', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useDeleteBlockedSlotMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync('bs1');
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/coaching/blocked-slots/{slotID}', {
    params: { path: { groupID: 'g1', slotID: 'bs1' } },
  });
});
```

- [ ] Run and expect FAIL.
- [ ] Implement in `coaching.ts`:

```ts
export type BlockedSlotInput = components['schemas']['CreateBlockedSlotRequest'];

export function useCreateBlockedSlotMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (body: BlockedSlotInput) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/blocked-slots',
        { params: { path: { groupID: groupId } }, body },
      );
      if (error || !data) throw new Error('Failed to create blocked slot');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'blocked-slots'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useDeleteBlockedSlotMutation(
  groupId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await (client as typeof api).DELETE(
        '/groups/{groupID}/coaching/blocked-slots/{slotID}',
        { params: { path: { groupID: groupId, slotID: slotId } } },
      );
      if (error !== undefined) throw new Error('Failed to delete blocked slot');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'blocked-slots'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}
```

- [ ] Run and expect PASS (full coaching test file): `pnpm --dir mobile jest src/api/queries/coaching.test.tsx`.
- [ ] Commit: `... git commit -m 'feat(coaching): blocked-slot create/delete hooks'`

---

## UI Parity & Component Reuse

Header treatment for this package: the availability screen is a **pushed/detail route**, so it uses the shared **`ZBackHeader`** (`mobile/src/components/ui/z-back-header.tsx`, WP-UI0) — title `t('sessions.availability.manageTitle')`, default `onBack = router.back()`, no trailing `action`. Below the header sits a **summary card** (`ZCard` with the long `title` + `summary`) per the form/wizard rule. **Do NOT use `ZPageHeader`** (reserved for the 5 tab index screens) and **do NOT hand-roll a local `Header()`** — `ZBackHeader` already supplies the back `ZIconButton` with `accessibilityLabel = t('common.actions.back')`. Add/edit affordances are inline section buttons (`ZButton`, `add` action) — NOT a FAB (the FAB on the Coaching tab is reserved for the primary `book` create action; "Add session type / availability / blocked date" are three distinct secondary creates inside the screen, which is the web pattern of per-tab add buttons). The entry point from the Coaching tab is a header overflow `ZIconButton` (config action), gated `coaching:availability:manage`.

| Screen element | Reuses (existing) — path | Or NEW (justification) |
|---|---|---|
| Screen root | `ZScreen` — `mobile/src/components/ui/z-screen.tsx` | — |
| Back header (pushed route) | **`ZBackHeader`** (WP-UI0) — `mobile/src/components/ui/z-back-header.tsx` | — (shared primitive; `title={t('sessions.availability.manageTitle')}`, no `action`. Replaces the old local `Header()`; supplies the back button + `t('common.actions.back')` a11y label.) |
| Header summary card (title + summary) | `ZCard` + `Text` — `mobile/src/components/ui/z-card.tsx` | — (form/wizard summary per rule; mirrors web `sessions.availability.title`/`summary`) |
| Section switch (Session Types / Weekly Schedule / Blocked Dates) with counts | `ZTabs` (count badge built in) — `mobile/src/components/ui/z-tabs.tsx` | — (web `z-tabs` counterpart; web uses `tabOptions()` with `badge`) |
| Permission gate (no `coaching:availability:manage`) | `ZEmptyState` — `mobile/src/components/ui/z-empty-state.tsx` | — (title `t('sessions.availability.noPermission')`, body `noPermissionDescription` — NOT the group-membership `noGroups` strings) |
| Empty group state (member of no group) | `ZEmptyState` — `mobile/src/components/ui/z-empty-state.tsx` | — (web `noGroups` empty state; only when authorized but groupless) |
| Group picker (when >1 group) | `ZSelect` — `mobile/src/components/ui/z-select.tsx` | — (single picker primitive, see below) |
| Loading / error / empty per section | `ZSkeleton` / `ZQueryError` / `ZEmptyState` | — (four-state rule) |
| Session-type list row (name + duration badge + description + edit/delete) | composes `ZCard` + `ZBadge` + `ZIconButton` | **NEW `SessionTypeRow`** (`mobile/src/components/session-type-row.tsx`) — counterpart of web `@case('session-types')` `<article>`. Not SHARED (mobile screen-local; no other package needs it). |
| Weekly-schedule list row (weekday + "start – end" + edit/delete) | composes `ZCard` + `ZIconButton` | **NEW `ScheduleDayRow`** (`mobile/src/components/schedule-day-row.tsx`) — counterpart of web `@case('schedule')` `<article>`. Not SHARED. |
| Blocked-date list row (date + optional window + optional reason + delete) | composes `ZCard` + **`ZIconTile`** (WP-UI0, `icon=<CalendarOff/>`, `tone='neutral'`) + `ZIconButton` (delete) | reuses `ZCard` directly inline (single-action, no edit) — the web blocked `<article>` only has a delete; no new component needed. The leading glyph uses the shared `ZIconTile` (z-tokens), NOT a raw `bg-*`/`text-white` tile. Date text via the `datetime` helper `formatDate`. |
| Variable lists (session types / schedule / blocked) | `FlatList` with real-id `keyExtractor` | — (no `ScrollView`+`.map`) |
| Add / Edit form (session type: name + description + duration) | `ZFieldLabel` + `ZTextInput` + `ZTextarea` + `ZSelect` (duration) + `ZFieldError` inside `ZDialogPanel` | — (web `z-form-dialog`; mobile sheet = `ZDialogPanel`) |
| Add / Edit form (availability: day + start + end) | `ZSelect` (day) + `ZSelect` (start time) + `ZSelect` (end time) | — (single picker primitive) |
| Add form (blocked date: date + optional start/end + optional reason) | `ZSelect` (date) + `ZSelect` (start/end) + `ZTextarea` (reason) | — (single picker primitive) |
| Form save feedback | inline error banner (`Text` + `text-z-danger`) on FAILURE + success `showToast` | — (form-save convention: create/update of session-type/availability/blocked all surface a **persistent inline banner** on failure, not only a toast; fire-and-forget delete uses `ZToast` only) |
| Delete (session type / availability / blocked date) | `ZConfirmDialog` (danger tone) — `mobile/src/components/ui/z-confirm-dialog.tsx` | — (destructive → confirm dialog rule; web uses `z-confirm-dialog`) |
| Keyboard handling | `ZKeyboardAvoidingView` + `keyboardShouldPersistTaps='handled'` | — |
| Coaching-tab entry to `/availability` | `ZIconButton` (header overflow, `CalendarCog` icon) — `mobile/src/components/ui/z-icon-button.tsx` | — (config action, not FAB) |
| Home 5th onboarding step | `FirstStepRow` — `mobile/src/components/first-step-row.tsx` | — (REUSE, do not reinvent) |

**Single date/time picker primitive — DECISION: `ZSelect` for all of day-of-week, time-of-day, and blocked-date.** Rationale: (1) `ZTextInput` has **no** `type="time"`/`type="date"` prop (verified) — the web's native HTML time/date inputs have no RN equivalent in this design system; (2) the web availability dialog already uses `z-select` for the day field, so `ZSelect` is the established counterpart; (3) using one primitive for every temporal field satisfies the "no two different pickers" constraint. Time options are generated as `HH:MM` at 15-minute steps (00:00–23:45); the blocked-date label is rendered via the shared `datetime` helper `formatDate` (the option `value` stays `YYYY-MM-DD`); the next 90 days are generated to match the server's 3-month blocked-slot window. Helper generators live in the screen file.

> **Deliberate divergence from the reports availability/date-strategy stepper.** The reports plan (`20260613233003_*`) uses a `±` **stepper** for its numeric date-range control; this screen uses `ZSelect` dropdowns for day/time/date. That is intentional and not drift: a stepper expresses a single monotonic quantity (a count of days), whereas availability needs to pick an arbitrary weekday, an arbitrary `HH:MM`, and an arbitrary calendar date out of 90 — a non-monotonic choice from a discrete set, which is exactly what a select is for. Both screens still share the **one minutes key** `common.labels.minutesShort` for duration display (`t('common.labels.minutesShort', { count })`). Cross-reference: reports stepper rationale in `.agents/plans/20260613233003_*` (reports/availability section).

**Duration label — DECISION: `t('common.labels.minutesShort', { count: minutes })`** (= `"{{count}} min"`), the SAME key reports uses for "N min". Do NOT build a screen-local `\`${m} min\`` string. This applies to the `SessionTypeRow` `durationLabel` prop AND the duration `ZSelect` option labels (built from `DURATION_VALUES` inside the component via the `durationOptions` memo, since the label needs `t`).

---

## Phase B — Screen + entry points + home step (gate on the parallel session signalling done)

⚠️ B-T2/B-T3/B-T4 touch `mobile/src/app/(tabs)/coaching.tsx` and `index.tsx`, which overlap the parallel screen-touching session. **Do not start B-T2..B-T4 until the user signals their session is done.** B-T1 (new files only) is collision-free and may start as soon as Phase A is merged into the working tree.

### B-T1 — NEW domain rows: SessionTypeRow + ScheduleDayRow

**Files:** `mobile/src/components/session-type-row.tsx`, `mobile/src/components/session-type-row.test.tsx`, `mobile/src/components/schedule-day-row.tsx`, `mobile/src/components/schedule-day-row.test.tsx`

- [ ] Write `session-type-row.test.tsx` first:

```tsx
import { render } from '@testing-library/react-native';
import { SessionTypeRow } from './session-type-row';

const TYPE = {
  id: 'st1',
  expert_id: 'e1',
  group_id: 'g1',
  name: '60-min session',
  description: 'Standard session',
  duration_minutes: 60,
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

test('SessionTypeRow shows name, duration badge, and description', async () => {
  const { getByText } = await render(
    <SessionTypeRow
      sessionType={TYPE}
      durationLabel="60 min"
      editLabel="Edit"
      deleteLabel="Delete"
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
  expect(getByText('60-min session')).toBeTruthy();
  expect(getByText('60 min')).toBeTruthy();
  expect(getByText('Standard session')).toBeTruthy();
});
```

- [ ] Run and expect FAIL (module not found).
- [ ] Implement `session-type-row.tsx` (compose `ZCard` + `ZBadge` + `ZIconButton`; the parent passes localized labels so the row holds no `t()`):

```tsx
import { Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import type { SessionType } from '../api/queries/coaching';
import { colors } from '../theme/colors';
import { ZBadge } from './ui/z-badge';
import { ZCard } from './ui/z-card';
import { ZIconButton } from './ui/z-icon-button';

/**
 * One session-type row. Mobile counterpart of the web manage-availability
 * session-type <article> (pages/manage-availability, @case('session-types')):
 * name + duration badge + description, with edit/delete icon-buttons.
 */
export function SessionTypeRow({
  sessionType,
  durationLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  testID,
}: {
  sessionType: SessionType;
  durationLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  testID?: string;
}) {
  return (
    <ZCard testID={testID}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-semibold text-z-text">{sessionType.name}</Text>
            <ZBadge label={durationLabel} />
          </View>
          {sessionType.description ? (
            <Text numberOfLines={3} className="mt-2 text-sm leading-6 text-z-muted">
              {sessionType.description}
            </Text>
          ) : null}
        </View>
        <View className="flex-row shrink-0 gap-2">
          <ZIconButton label={editLabel} variant="secondary" size="sm" onPress={onEdit}>
            <Pencil color={colors.text} size={16} />
          </ZIconButton>
          <ZIconButton label={deleteLabel} variant="secondary" size="sm" onPress={onDelete}>
            <Trash2 color={colors.danger} size={16} />
          </ZIconButton>
        </View>
      </View>
    </ZCard>
  );
}
```

- [ ] Write `schedule-day-row.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { ScheduleDayRow } from './schedule-day-row';

const ITEM = {
  id: 'a1',
  expert_id: 'e1',
  group_id: 'g1',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

test('ScheduleDayRow shows the weekday name and time range', async () => {
  const { getByText } = await render(
    <ScheduleDayRow
      availability={ITEM}
      dayName="Monday"
      editLabel="Edit"
      deleteLabel="Delete"
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
  expect(getByText('Monday')).toBeTruthy();
  expect(getByText('09:00 – 17:00')).toBeTruthy();
});
```

- [ ] Run and expect FAIL.
- [ ] Implement `schedule-day-row.tsx`:

```tsx
import { Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import type { CoachingAvailability } from '../api/queries/coaching';
import { colors } from '../theme/colors';
import { ZCard } from './ui/z-card';
import { ZIconButton } from './ui/z-icon-button';

/**
 * One weekly-schedule row. Mobile counterpart of the web manage-availability
 * schedule <article> (pages/manage-availability, @case('schedule')): weekday
 * name + "start – end", with edit/delete icon-buttons.
 */
export function ScheduleDayRow({
  availability,
  dayName,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  testID,
}: {
  availability: CoachingAvailability;
  dayName: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  testID?: string;
}) {
  return (
    <ZCard testID={testID}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-z-text">{dayName}</Text>
          <Text className="mt-1 text-sm text-z-muted">
            {`${availability.start_time} – ${availability.end_time}`}
          </Text>
        </View>
        <View className="flex-row shrink-0 gap-2">
          <ZIconButton label={editLabel} variant="secondary" size="sm" onPress={onEdit}>
            <Pencil color={colors.text} size={16} />
          </ZIconButton>
          <ZIconButton label={deleteLabel} variant="secondary" size="sm" onPress={onDelete}>
            <Trash2 color={colors.danger} size={16} />
          </ZIconButton>
        </View>
      </View>
    </ZCard>
  );
}
```

- [ ] Run and expect PASS: `pnpm --dir mobile jest src/components/session-type-row.test.tsx src/components/schedule-day-row.test.tsx`.
- [ ] Commit: `... git add mobile/src/components/session-type-row.tsx mobile/src/components/session-type-row.test.tsx mobile/src/components/schedule-day-row.tsx mobile/src/components/schedule-day-row.test.tsx && git commit -m 'feat(mobile): availability session-type + schedule-day rows'`

### B-T2 — i18n: verify existing keys + add the new mobile-screen keys

**Files:** `web/dashboard-next/public/i18n/{en,de,fr}.json` (source), then synced into `mobile/src/i18n/locales/{en,de,fr}.json`

Most keys already exist in BOTH web and mobile JSONs (verified): `sessions.availability.*` (title, titleForGroup, summary, sessionTypes, weeklySchedule, blockedDates, add*/edit*/no*/delete*/confirmDelete/failed*/namePlaceholder/descriptionPlaceholder/reasonPlaceholder/nameRequired/durationInvalid/startTimeRequired/endTimeRequired/dateRequired), `weekdays.0..6`, `common.fields.{name,description,duration,date,startTime,endTime,reasonOptional,group}`, `common.labels.{day,minutesShort,fullDay}` (`minutesShort` = `"{{count}} min"`), `common.actions.{add,edit,delete,cancel,save,back}`, and `home.firstSteps.{setAvailability,setAvailabilityDescription,manageAvailability}`.

⚠️ **Five keys are genuinely MISSING and must be added** (verified absent in `web/dashboard-next/public/i18n/en.json` and the synced mobile JSONs). The earlier draft of this task wrongly asserted `manageTitle` already existed; it does not, and B-T4 (the Coaching-tab header action) depends on it. Add to the **web JSON source** first, then `sync:i18n`:

| Key (under `sessions.availability`) | en value | Why it is new |
|---|---|---|
| `manageTitle` | `"Availability"` | Short header/entry-point label. Used by `ZBackHeader` title on the screen AND by the Coaching-tab header action `label` in B-T4. (Web has no compact label — it uses the long `title` in a page header.) |
| `noPermission` | `"Availability not available"` | Permission-gate **title** (fix 7). The screen self-gates on `coaching:availability:manage`; the `noGroups`/`noGroupsDescription` strings are about group *membership*, not permission, so they must NOT be reused for the gate. |
| `noPermissionDescription` | `"You do not have permission to manage coaching availability."` | Permission-gate body (fix 7). |
| `endBeforeStart` | `"End time must be after start time."` | Inline time-order error for the availability sheet AND the blocked-slot sheet (fix 3). Mirrors the handler 400 `"start_time must be before end_time"` (`blocked_slots.go:138`, `helpers.go:70`). The existing `startTimeRequired`/`endTimeRequired` strings mean "a value is required" and are the wrong semantics for an ordering error. |
| (3 picker placeholders, below) | — | The web uses native `<input type=date/time>` so it has no placeholder strings; mobile's `ZSelect` needs them. |

Also add the three picker placeholders under `sessions.availability`: `"selectDayPlaceholder": "Select a day"`, `"selectTimePlaceholder": "Select a time"`, `"selectDatePlaceholder": "Select a date"`.

Reuse (do NOT add new keys for): success toast → `toast.successTitle`; error toast title → `toast.errorTitle`; full-day option label → `common.labels.fullDay`; group field label → `common.fields.group`; the back-button a11y label is supplied by `ZBackHeader` itself via `common.actions.back` (do not pass it).

- [ ] Verify the baseline keys are present (no-op expected): `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && node -e \"const d=require('./mobile/src/i18n/locales/en.json'); for (const k of ['title','summary','sessionTypes','weeklySchedule','blockedDates','confirmDelete']) if(!d.sessions.availability[k]) throw new Error('missing '+k); if(!d.home.firstSteps.setAvailability) throw new Error('missing setAvailability'); console.log('ok')\""`
- [ ] Add the eight new keys (`manageTitle`, `noPermission`, `noPermissionDescription`, `endBeforeStart`, `selectDayPlaceholder`, `selectTimePlaceholder`, `selectDatePlaceholder`) to `web/dashboard-next/public/i18n/en.json` under `sessions.availability`, and translate each in `de.json`/`fr.json`.
- [ ] Run `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run sync:i18n"`. ⚠️ **Destructive:** `sync:i18n` drops mobile-only keys (e.g. `sessions.call.sessionFallback`). After syncing, inspect `git diff mobile/src/i18n/locales/en.json` — ONLY the eight new keys should appear added; if any unrelated mobile-only key vanished, restore it by hand from web JSONs.
- [ ] Commit: `... git add web/dashboard-next/public/i18n mobile/src/i18n/locales && git commit -m 'i18n(mobile): availability manage title, permission gate, time-order error, picker placeholders'`

### B-T3 — The availability screen

**Files:** `mobile/src/app/availability.tsx`, `mobile/src/__tests__/availability-screen.test.tsx`

This is the largest task. The screen: self-gates on `coaching:availability:manage`; picks a group (auto-select when exactly one, otherwise `ZSelect`); renders a header card + `ZTabs` (three sections with live counts); each section is a four-state `FlatList`; add/edit opens an inline sheet (`ZDialogPanel`) with the section's form; delete opens `ZConfirmDialog`. Mutations show a success `showToast` and an inline error banner on failure.

- [ ] Write `mobile/src/__tests__/availability-screen.test.tsx` first. Mock the hooks module and `expo-router`; assert (a) the permission gate (no perm → empty state, no tabs), (b) the session-types empty state when the list is empty, (c) tabs render with counts. Example:

```tsx
import { render } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

const mockUseAuth = jest.fn();
jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) => mockUseAuth(sel),
  api: {},
}));

jest.mock('../api/queries/groups', () => ({
  useGroupsQuery: () => ({ data: [{ id: 'g1', name: 'Dojo' }], isSuccess: true, isPending: false, isError: false }),
}));

const emptyList = { data: [], isPending: false, isError: false, refetch: jest.fn() };
jest.mock('../api/queries/coaching', () => ({
  useSessionTypesQuery: () => emptyList,
  useMyAvailabilityQuery: () => emptyList,
  useBlockedSlotsQuery: () => emptyList,
  useCreateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeactivateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateBlockedSlotMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteBlockedSlotMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import AvailabilityScreen from '../app/availability';

function withPermission(perm: string | null) {
  const user = perm ? { id: 'u1', permissions: [perm] } : { id: 'u1', permissions: [] };
  mockUseAuth.mockImplementation((sel: (s: unknown) => unknown) => sel({ user }));
}

test('shows a permission empty state when the user cannot manage availability', async () => {
  withPermission(null);
  const { getByTestId, queryByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-no-permission')).toBeTruthy();
  expect(queryByTestId('availability-tabs')).toBeNull();
});

test('renders the tabs and the session-types empty state for an authorized expert', async () => {
  withPermission('coaching:availability:manage');
  const { getByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-tabs')).toBeTruthy();
  expect(getByTestId('availability-empty-session-types')).toBeTruthy();
});
```

- [ ] Run and expect FAIL (module `../app/availability` not found).
- [ ] Implement `mobile/src/app/availability.tsx`. Key structure (mirror `book.tsx` for the header icon-button + `ZKeyboardAvoidingView`, and `coaching.tsx` for `ZPageHeader`+`ZTabs`+`FlatList` four-state; mirror the web manage-availability for fields and copy). Skeleton of the implementation (fill in the three forms — they are short and enumerated below):

```tsx
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarOff, Plus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type {
  CoachingAvailability,
  CoachingBlockedSlot,
  SessionType,
} from '../api/queries/coaching';
import {
  useSessionTypesQuery,
  useMyAvailabilityQuery,
  useBlockedSlotsQuery,
  useCreateSessionTypeMutation,
  useUpdateSessionTypeMutation,
  useDeactivateSessionTypeMutation,
  useCreateAvailabilityMutation,
  useUpdateAvailabilityMutation,
  useDeleteAvailabilityMutation,
  useCreateBlockedSlotMutation,
  useDeleteBlockedSlotMutation,
} from '../api/queries/coaching';
import { useGroupsQuery } from '../api/queries/groups';
import { useAuth } from '../auth/auth-store';
import { formatDate } from '../lib/datetime'; // WP-UI0 shared helper
import { ScheduleDayRow } from '../components/schedule-day-row';
import { SessionTypeRow } from '../components/session-type-row';
import { ZBackHeader } from '../components/ui/z-back-header'; // WP-UI0
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZConfirmDialog } from '../components/ui/z-confirm-dialog';
import { ZDialogPanel } from '../components/ui/z-dialog-panel';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZIconTile } from '../components/ui/z-icon-tile'; // WP-UI0
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect, type ZSelectOption } from '../components/ui/z-select';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTabs } from '../components/ui/z-tabs';
import { ZTextInput } from '../components/ui/z-text-input';
import { ZTextarea } from '../components/ui/z-textarea';
import { showToast } from '../components/ui/z-toast';
import { colors } from '../theme/colors';

type Section = 'session-types' | 'schedule' | 'blocked';

// Duration VALUES only; the `label` is built at render time via
// t('common.labels.minutesShort', { count }) so it shares the reports minutes
// key (see "Duration label" decision above) — do NOT hardcode `${m} min`.
const DURATION_VALUES: number[] = Array.from(
  { length: (120 - 15) / 5 + 1 },
  (_, i) => 15 + i * 5,
);

function timeOptions(): ZSelectOption[] {
  const out: ZSelectOption[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      out.push({ value: v, label: v });
    }
  }
  return out;
}
const TIME_OPTIONS = timeOptions();

function dateOptions(): ZSelectOption[] {
  const out: ZSelectOption[] = [];
  const today = new Date();
  for (let i = 0; i < 90; i += 1) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10); // YYYY-MM-DD (the API value)
    // Label via the shared datetime helper (WP-UI0) — no per-screen formatter.
    out.push({ value, label: formatDate(value) });
  }
  return out;
}
const DATE_OPTIONS = dateOptions();

export default function AvailabilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canManage = permissions !== null && permissions.includes('coaching:availability:manage');

  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data ?? [];
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const groupId = groups.length === 1 ? groups[0].id : selectedGroupId;

  const [section, setSection] = useState<Section>('session-types');

  // ── queries (all gated on a resolved groupId) ──────────────────────────────
  const typesQuery = useSessionTypesQuery(groupId);
  const availabilityQuery = useMyAvailabilityQuery(groupId);
  const blockedQuery = useBlockedSlotsQuery(groupId);

  // ── mutations ──────────────────────────────────────────────────────────────
  const createType = useCreateSessionTypeMutation(groupId);
  const updateType = useUpdateSessionTypeMutation(groupId);
  const deactivateType = useDeactivateSessionTypeMutation(groupId);
  const createAvail = useCreateAvailabilityMutation(groupId);
  const updateAvail = useUpdateAvailabilityMutation(groupId);
  const deleteAvail = useDeleteAvailabilityMutation(groupId);
  const createBlocked = useCreateBlockedSlotMutation(groupId);
  const deleteBlocked = useDeleteBlockedSlotMutation(groupId);

  // ── sheet + dialog state ────────────────────────────────────────────────────
  const [typeSheet, setTypeSheet] = useState<{ editing: SessionType | null } | null>(null);
  const [availSheet, setAvailSheet] = useState<{ editing: CoachingAvailability | null } | null>(null);
  const [blockedSheet, setBlockedSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'type'; id: string }
    | { kind: 'avail'; id: string }
    | { kind: 'blocked'; id: string }
    | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);

  const dayOptions = useMemo<ZSelectOption[]>(
    () => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`weekdays.${d}`) })),
    [t],
  );

  // Duration options: value-only list → localized label via the shared minutes
  // key (same key reports uses). See "Duration label" decision.
  const durationOptions = useMemo<ZSelectOption[]>(
    () =>
      DURATION_VALUES.map((m) => ({
        value: String(m),
        label: t('common.labels.minutesShort', { count: m }),
      })),
    [t],
  );

  // ── permission gate (fix 7: a real permission copy, NOT the group strings) ──
  if (!canManage) {
    return (
      <ZScreen edges={['top']}>
        <ZBackHeader title={t('sessions.availability.manageTitle')} />
        <View testID="availability-no-permission" className="p-4">
          <ZEmptyState
            title={t('sessions.availability.noPermission')}
            description={t('sessions.availability.noPermissionDescription')}
          />
        </View>
      </ZScreen>
    );
  }

  const tabs = [
    {
      id: 'session-types',
      label: t('sessions.availability.sessionTypes'),
      count: (typesQuery.data ?? []).length,
    },
    {
      id: 'schedule',
      label: t('sessions.availability.weeklySchedule'),
      count: (availabilityQuery.data ?? []).length,
    },
    {
      id: 'blocked',
      label: t('sessions.availability.blockedDates'),
      count: (blockedQuery.data ?? []).length,
    },
  ];

  // ... section content renderer (four states) + add buttons + sheets + confirm
  //     dialog. Enumerated below.

  return (
    <ZScreen edges={['top']}>
      {/* Shared back header (WP-UI0). Default onBack = router.back(); the back
          ZIconButton + t('common.actions.back') a11y label are built in. */}
      <ZBackHeader title={t('sessions.availability.manageTitle')} />
      <ZKeyboardAvoidingView>
        {/* form/wizard summary card */}
        <ZCard className="m-4 gap-1">
          <Text className="text-2xl font-semibold text-z-text">
            {t('sessions.availability.title')}
          </Text>
          <Text className="text-sm leading-6 text-z-muted">
            {t('sessions.availability.summary')}
          </Text>
        </ZCard>

        {groups.length > 1 ? (
          <View className="mx-4 mb-2 gap-1">
            <ZFieldLabel label={t('common.fields.group')} />
            <ZSelect
              testID="availability-group-select"
              value={groupId || undefined}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
              placeholder={t('sessions.book.selectGroup')}
              accessibilityLabel={t('common.fields.group')}
              onValueChange={setSelectedGroupId}
            />
          </View>
        ) : null}

        <View className="px-4">
          <ZTabs
            testID="availability-tabs"
            tabs={tabs}
            activeId={section}
            onChange={(id) => setSection(id as Section)}
          />
        </View>

        {/* section content here */}

      </ZKeyboardAvoidingView>

      {/* delete confirm dialog (single, switched on deleteTarget.kind) */}
      <ZConfirmDialog
        visible={deleteTarget !== null}
        title={t('sessions.availability.confirmDelete')}
        tone="danger"
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </ZScreen>
  );

  // handleConfirmDelete, handleSaveType, handleSaveAvail, handleSaveBlocked defined in scope.
}
```

> No local `Header()` here — the screen uses the shared **`ZBackHeader`** (WP-UI0) at both the gate and the main return. This drops the old hardcoded `label="Back"`; the primitive supplies `accessibilityLabel = t('common.actions.back')` itself.

  Fill in these enumerated pieces (each mirrors the web manage-availability exactly):

  - **Section content renderer** — a `FlatList` per section with four states checked in order pending → error → empty → data:
    - Session types: `data={typesQuery.data ?? []}`, `keyExtractor={(it)=>it.id}`, `renderItem` → `<SessionTypeRow sessionType={item} durationLabel={t('common.labels.minutesShort',{count:item.duration_minutes})} editLabel={t('common.actions.edit')} deleteLabel={t('common.actions.delete')} onEdit={()=>{setFormError(null);setTypeSheet({editing:item});}} onDelete={()=>setDeleteTarget({kind:'type',id:item.id})} />`. `isPending` → `<ZSkeleton className="h-24 w-full rounded-lg" />` ×2. `isError` → `<ZQueryError title={t('sessions.availability.failedCreateSessionType')} onRetry={()=>void typesQuery.refetch()} />`. Empty → `<ZEmptyState testID="availability-empty-session-types" title={t('sessions.availability.noSessionTypes')} description={t('sessions.availability.noSessionTypesDescription')} />`. A header `ZButton` (`label={t('sessions.availability.addSessionType')}` icon=`<Plus .../>`) above the list → `setFormError(null); setTypeSheet({editing:null})`.
    - Schedule: `data={availabilityQuery.data ?? []}` → `<ScheduleDayRow availability={item} dayName={t('weekdays.'+item.day_of_week)} editLabel=... deleteLabel=... onEdit={()=>{setFormError(null);setAvailSheet({editing:item});}} onDelete={()=>setDeleteTarget({kind:'avail',id:item.id})} />`. Empty → `noAvailability`/`noAvailabilityDescription`. Add button `addAvailability` → `setFormError(null); setAvailSheet({editing:null})`.
    - Blocked: `data={blockedQuery.data ?? []}` → inline `ZCard` row composed as `flex-row items-start gap-3`: leading **`<ZIconTile icon={<CalendarOff color={colors.text} size={18} />} tone="neutral" size="sm" />`** (WP-UI0 — z-tokens only; NO raw `bg-*`/`text-white`), then a `flex-1` text column = **`formatDate(item.blocked_date)`** (shared `datetime` helper, NOT a local `toLocaleDateString`) + optional time line `${item.start_time} – ${item.end_time}` rendered ONLY when both `item.start_time` and `item.end_time` are present, else `t('common.labels.fullDay')` + optional `item.reason` (`text-sm text-z-muted`), then a trailing `ZIconButton` delete (`label={t('common.actions.delete')}`, `<Trash2 color={colors.danger} size={16} />`) → `setDeleteTarget({kind:'blocked',id:item.id})`. Empty → `noBlockedDates`/`noBlockedDatesDescription`. Add button `addBlockTime` → `setFormError(null); setBlockedSheet(true)`.
  - **Session-type sheet** (`<ZDialogPanel visible={typeSheet!==null} onClose={()=>setTypeSheet(null)}>`): local `useState` for `name`/`description`/`duration` seeded from `typeSheet?.editing` on open (seed by keying the sheet body component on `editing?.id ?? 'new'`, or set state when opening). Fields: `ZFieldLabel`+`ZTextInput` (name, `accessibilityLabel={t('common.fields.name')}`, placeholder `namePlaceholder`, `invalid` when empty) + `ZFieldError` (`nameRequired`) when touched-empty; `ZFieldLabel`+`ZTextarea` (description, **`accessibilityLabel={t('common.fields.description')}`** — `ZTextarea` requires a named a11y label, fix 4 — placeholder `descriptionPlaceholder`, `rows={3}`); `ZFieldLabel`+`ZSelect` (duration, **`durationOptions`** [the `t`-built list above, labels via `common.labels.minutesShort`], `accessibilityLabel={t('common.fields.duration')}`, default `'45'`). Inline `formError` banner (`Text text-z-danger`) when set (fix 5). Footer: cancel `ZButton variant="secondary"` + save `ZButton loading={createType.isPending||updateType.isPending}`. On save: validate name non-empty (else `setFormError(t('sessions.availability.nameRequired'))`, return) → call `createType.mutateAsync({name,description,duration_minutes:Number(duration)})` or `updateType.mutateAsync({sessionTypeId:editing.id,body:{...}})`; on success `setTypeSheet(null)` + `showToast(t('toast.successTitle'),undefined,'success')`; on failure `setFormError(t('sessions.availability.failedCreateSessionType'))` (or `failedUpdateSessionType`) — **inline banner, not a toast** (form-save convention, fix 5).
  - **Availability sheet**: fields `ZSelect` day (`dayOptions`, default `'1'`, placeholder `selectDayPlaceholder`, `accessibilityLabel={t('common.labels.day')}`), `ZSelect` start (`TIME_OPTIONS`, default `'09:00'`, placeholder `selectTimePlaceholder`, `accessibilityLabel={t('common.fields.startTime')}`), `ZSelect` end (`TIME_OPTIONS`, default `'17:00'`, placeholder `selectTimePlaceholder`, `accessibilityLabel={t('common.fields.endTime')}`). **Pre-submit validation (fix 3 — mirror the handler 400 at `helpers.go:70`): if `start >= end` (string compare is correct for zero-padded HH:MM), `setFormError(t('sessions.availability.endBeforeStart'))` and RETURN without calling the mutation.** On valid save call `createAvail.mutateAsync({day_of_week:Number(day),start_time:start,end_time:end})` / `updateAvail.mutateAsync({availabilityId:editing.id,body:{...}})`; success → close + `showToast(t('toast.successTitle'),undefined,'success')`; failure → `setFormError(t('sessions.availability.failedAddAvailability'))` (or `failedUpdateAvailability`) — **inline banner** (fix 5).
  - **Blocked sheet**: `ZSelect` date (`DATE_OPTIONS`, default today, placeholder `selectDatePlaceholder`, `accessibilityLabel={t('common.fields.date')}`); optional `ZSelect` start + `ZSelect` end (`TIME_OPTIONS`, allow empty — prepend a `{value:'',label:t('common.labels.fullDay')}` option, `accessibilityLabel` = `common.fields.startTime`/`endTime`); `ZTextarea` reason (**`accessibilityLabel={t('common.fields.reasonOptional')}`** — fix 4 — placeholder `reasonPlaceholder`, `rows={3}`). **Pre-submit validation (fix 3 — mirror the handler 400 at `blocked_slots.go:134-139`): date required (else `setFormError(t('sessions.availability.dateRequired'))`); if exactly one of start/end is set, both are required; if both set and `start >= end`, `setFormError(t('sessions.availability.endBeforeStart'))`. RETURN on any failure without calling the mutation.** On valid save `createBlocked.mutateAsync({blocked_date,start_time:start||undefined,end_time:end||undefined,reason:reason.trim()||undefined})`; success → close + `showToast(t('toast.successTitle'),undefined,'success')`; failure → `setFormError(t('sessions.availability.failedBlockTime'))` — **inline banner** (fix 5).
  - **`handleConfirmDelete`**: switch on `deleteTarget.kind` → `deactivateType.mutateAsync(id)` / `deleteAvail.mutateAsync(id)` / `deleteBlocked.mutateAsync(id)`; on success `setDeleteTarget(null)` + `showToast(t('toast.successTitle'),undefined,'success')`; on failure `showToast(t('toast.errorTitle'), t('sessions.availability.failedDeleteSessionType'/...), 'error')`.
  - All sheets sit inside `ZKeyboardAvoidingView`; `ZDialogPanel` already provides a Modal. (No `ScrollView` is needed for the sheet bodies — they are short. The section lists are `FlatList`s.)

- [ ] Run and expect PASS: `pnpm --dir mobile jest src/__tests__/availability-screen.test.tsx`.
- [ ] Typecheck + lint just this area: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run typecheck"` and `make mobile:lint` (once the parallel session is done so the full tree compiles).
- [ ] Commit: `... git add mobile/src/app/availability.tsx mobile/src/__tests__/availability-screen.test.tsx && git commit -m 'feat(mobile): expert availability management screen'`

### B-T4 — Entry point: Coaching-tab header action

**Files:** `mobile/src/app/(tabs)/coaching.tsx`

- [ ] Add `CalendarCog` to the `lucide-react-native` import; read `canManageAvailability = permissions !== null && permissions.includes('coaching:availability:manage')` alongside the existing `canBook`. In the `ZPageHeader`, pass an `action` slot (the header already renders `<ZPageHeader title=... subtitle=... />` — add `action={canManageAvailability ? <ZIconButton testID="coaching-manage-availability" label={t('sessions.availability.manageTitle')} variant="ghost" size="md" onPress={() => router.push('/availability')}><CalendarCog color={colors.text} size={22} /></ZIconButton> : undefined}`). This is the secondary/config action per the mobile header rule; the `book` FAB is unchanged.
- [ ] Verify the route resolves (expo-router file route `/availability` from B-T3). No new test needed for the one-line wiring; covered by manual emulator check. (If a test is wanted, add an assertion to an existing coaching screen test that the button renders when `coaching:availability:manage` is present.)
- [ ] Commit: `... git add "mobile/src/app/(tabs)/coaching.tsx" && git commit -m 'feat(mobile): coaching tab entry to manage availability'`

### B-T5 — Home 5th first-step (reuse FirstStepRow)

**Files:** `mobile/src/app/(tabs)/index.tsx`

The home screen already builds `steps` from permission-gated entries and reuses `FirstStepRow`. Add a 5th entry for availability, gated on `coaching:availability:manage`, completing when the expert has at least one availability block in their first group. Keys already exist: `home.firstSteps.setAvailability` / `setAvailabilityDescription`.

- [ ] In `index.tsx`, import `useMyAvailabilityQuery` from `../../api/queries/coaching`. After `const firstGroupId = groupList[0]?.id;`, add `const availabilityQuery = useMyAvailabilityQuery(firstGroupId ?? '');` and `const hasAvailability = (availabilityQuery.data ?? []).length > 0;`. Add `hasAvailability` and `firstGroupId` to the `steps` useMemo dependency array.
- [ ] Inside the `steps` useMemo, after the `coaching:book` block, add:

```tsx
if (has('coaching:availability:manage')) {
  list.push({
    completed: hasAvailability,
    labelKey: 'home.firstSteps.setAvailability',
    descriptionKey: 'home.firstSteps.setAvailabilityDescription',
    onPress: () => router.push('/availability'),
    testID: 'first-step-availability',
  });
}
```

- [ ] Verify the existing home screen test still passes (or add an assertion for `first-step-availability` rendering when the permission + an empty availability list are present): `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/app"` is not valid (no tests under app) — instead run the home screen test if one exists under `src/__tests__/`. If none asserts steps, this wiring is covered by the emulator screenshot.
- [ ] Commit: `... git add "mobile/src/app/(tabs)/index.tsx" && git commit -m 'feat(mobile): home set-availability first step'`

---

## Verification

- **Phase A:** `make api:openapi:lint` → 0 errors after each contract task; `pnpm --dir mobile run generate:api` is idempotent (`git diff --stat` clean on re-run); `pnpm --dir mobile jest src/api/queries/coaching.test.tsx` green. Go suite is unaffected (no Go change) — optionally confirm `make api:build` still builds. Adversarial pass: every contract operation's path/method/perm/status/body matches its handler in `internal/coaching/*` (use the inventory table above as the checklist); the availability create/update body is documented as an array (merge behaviour).
- **Phase B:** `make mobile:lint`, `pnpm --dir mobile run typecheck`, `make mobile:test` all green (run only after the parallel screen session is done so the tree compiles). Emulator screenshots in the PR body of: the availability screen on each of the three tabs (session types / weekly schedule / blocked dates), one add/edit sheet, the delete confirm dialog, the Coaching-tab header action, and the Home "Set coaching availability" first-step. (Mobile UI changes require emulator screenshots per `mobile/AGENTS.md`.)

## Out of scope / follow-ups

- The web availability page also offers a group-grid picker when no group is preselected; mobile uses a `ZSelect` group picker instead (simpler, list-screen-appropriate). Multi-group grid navigation is not ported.
- Native time/date wheel pickers (`@react-native-community/datetimepicker`) are intentionally NOT introduced — they are a second picker primitive and a native dependency; `ZSelect` with generated options satisfies the single-primitive constraint and needs no EAS rebuild. Revisit only if UX feedback demands a wheel.
- Editing a blocked slot (the backend + web only support create/delete for blocked slots) — matches the web; not a gap.
- Reordering / bulk operations on session types — not in the web either.

---

## SELF-REVIEW

**Spec coverage (every backend write endpoint surfaced + every required entry point):**
- session-types: create (A-T1) / update (A-T1) / deactivate (A-T1) → hooks A-T6 ✔; list reuses the existing `useSessionTypesQuery` (noted, not re-added — avoids contract drift) ✔.
- availability: list (A-T2) → hook A-T5; create/update/delete (A-T2) → hooks A-T7 ✔; array merge response documented ✔.
- blocked-slots: list (A-T3) → hook A-T5; create/delete (A-T3) → hooks A-T8 ✔.
- screen gated on `coaching:availability:manage` (B-T3, explicit `canManage` gate + the route is reachable only via gated entry points); the gate uses a real permission copy (`noPermission`/`noPermissionDescription`), NOT the group-membership `noGroups` strings (fix 7) ✔.
- "Manage availability" entry on Coaching tab header (B-T4) ✔; home 5th first-step reusing `FirstStepRow` (B-T5) ✔.
- single date/time picker primitive = `ZSelect` everywhere (decision stated; no second picker), with a documented deliberate divergence from the reports stepper (fix 6) ✔.
- delete via `ZConfirmDialog` (B-T3) ✔; schedule-day row + session-type row are NEW domain components modelled on web, reusing `ZCard`/`ZBadge` inside (B-T1) ✔.
- **WP-UI0 dependency:** the pushed route uses shared `ZBackHeader` (no local `Header()`), the blocked glyph + tiles use `ZIconTile` (z-tokens), and date display uses the shared `datetime` helper `formatDate` (fix 1) ✔.
- pre-submit time-order validation rejects `start >= end` for availability AND blocked slots, mirroring the handler 400s (`helpers.go:70`, `blocked_slots.go:138`) before the network call (fix 3) ✔; create/update failures surface an inline error banner per the form-save convention, deletes use `ZToast` (fix 5) ✔; `ZTextarea` a11y labels are named (fix 4) ✔.

**Placeholder scan:** No "TBD"/"add validation"/"handle edge cases"/"similar to Task N". Every YAML block, hook, test, and component is shown as real code. The screen task (B-T3) gives full code for scaffolding + the picker-option generators + every enumerated sub-piece (each is a one-action fill with the exact hook call, key, and copy named) — no logic is left to invention. Field lists, validation rules (incl. the explicit pre-submit `start >= end` reject for availability + blocked, fix 3), a11y labels (fix 4), inline-error-banner-on-failure copy (fix 5), toast/error keys, and mutation calls are all spelled out. The three WP-UI0 dependencies (`ZBackHeader`, `ZIconTile`, `datetime.formatDate`) are CONSUMED by exact name/props, not stubbed or redefined — they are delivered by `20260613233000_mobile_shared_ui_foundation.md`, on which B-T3 depends (see the note at the top + the B-T3 file-structure entry).

**Type / name consistency:** Hook names referenced by the screen (B-T3 import) and the home step (B-T5) — `useSessionTypesQuery`, `useMyAvailabilityQuery`, `useBlockedSlotsQuery`, `useCreate/Update/DeactivateSessionTypeMutation`, `useCreate/Update/DeleteAvailabilityMutation`, `useCreate/DeleteBlockedSlotMutation` — are each defined in A-T5..A-T8. Types `SessionType` (existing), `CoachingAvailability`, `CoachingBlockedSlot`, `SessionTypeInput`/`UpdateSessionTypeInput`, `AvailabilityInput`/`UpdateAvailabilityInput`, `BlockedSlotInput` are defined from generated `components['schemas'][...]` (A-T5..A-T8) and the generated names match the schema names added in A-T1..A-T3 (`CreateSessionTypeRequest`, `AvailabilityRequest`, `CoachingAvailability`, `CoachingBlockedSlot`, `CreateBlockedSlotRequest`). `ZSelectOption`, `ZSelect`, `ZTabs`, `ZConfirmDialog`, `ZDialogPanel`, `ZIconButton`, `ZFieldLabel`, `ZFieldError`, `ZTextInput`, `ZTextarea`, `ZCard`, `ZBadge`, `ZSkeleton`, `ZQueryError`, `ZEmptyState`, `ZKeyboardAvoidingView`, `showToast`, `FirstStepRow` are all real, verified primitive/component signatures (props used match their definitions — e.g. `ZSelect` uses `value`/`options`/`onValueChange`/`placeholder`/`accessibilityLabel`; `ZTabs` uses `tabs`/`activeId`/`onChange`; `ZConfirmDialog` uses `visible`/`onConfirm`/`onCancel`; `ZIconButton` takes children + `label`/`variant`/`size`; **`ZTextarea` REQUIRES `accessibilityLabel`** — verified, named for every usage per fix 4). The WP-UI0 primitives `ZBackHeader` (`title`/`subtitle?`/`onBack?`/`action?`/`testID?`) and `ZIconTile` (`icon`/`tone?`/`size?`/`testID?`) and helper `formatDate(iso)` are consumed by exact name/props from `20260613233000_mobile_shared_ui_foundation.md` and are not redefined here. Query keys are consistent: session-type mutations invalidate `['coaching', groupId, 'session-types']` (the exact key `useSessionTypesQuery` uses); availability/blocked mutations invalidate their own read key plus `['coaching', groupId, 'slots']`. i18n keys cited (`sessions.availability.*`, `weekdays.*`, `common.*`, `home.firstSteps.setAvailability*`, `toast.successTitle`/`errorTitle`) are verified present in the mobile JSON; the additions are eight keys in B-T2 (`manageTitle`, `noPermission`, `noPermissionDescription`, `endBeforeStart`, and the three `select*Placeholder` keys), all added to the web source then synced.
</content>
</invoke>
