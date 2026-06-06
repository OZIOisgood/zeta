# Reports — Handoff-Conformance Rebuild (Completion)

## Context
Review found the shipped reports UI rendered period-grouped **tables** — the
variant the design handoff (`docs/handoffs/design_handoff_reports/`) explicitly
forbids. The handoff locks one config: **Liste (Accordion) · Kompakt · ohne
Balken**, two role pages, period stepper, stat cards, totals chips, export menu.
User confirmed: **ohne Balken**, build **handoff-conform**. Plan:
`.agents/plans/20260606150000_reports_handoff_conformance.md`.

## Decision
The aggregate `/reports/summary` bucket endpoint could not feed an accordion of
per-event rows, so the response became **event-level** and the frontend ports the
prototype's `buildReport()` — nesting, aggregation and period filtering/stepping
all run client-side (instant ‹ › / „Heute", no refetch), matching the prototype.

## What changed
**Backend**
- `db/queries/reports.sql` — replaced 4 bucket queries with 4 event queries
  (`Report{Upload,Session}EventsFor{Expert,Student}`): one row per asset
  (duration = SUM of its video parts) / per past, non-cancelled booking
  (title = session type). No period/tz bucketing. Scoped to the caller. `make db:sqlc`.
- `internal/reports/handler.go` — `GET /reports/events` returns
  `{role, viewer, events[]}`; each event carries group + student + expert refs,
  title, `at`, unified `duration_seconds` (live minutes ×60). Role from `user.Role`;
  names via the existing `user_preferences` resolver. Dropped period/tz/from-to.
- Tests rewritten: `handler_test.go` (role scoping, minutes→seconds, unauth),
  `integration_test.go` (multi-part duration sum, student-side view).
- Kept: `videos.duration_seconds` migration + Mux capture + backfill; `reports:read`.

**Frontend (`web/dashboard-next`)**
- `features/reports/reports.util.ts` (new) — ported period model
  (`eventInPeriod`/`stepCursor`/`canStepForward`/…) and `buildReport()`, plus
  `durationHM`/`videoClock`. Pure; unit-tested (`reports.util.spec.ts`).
- `core/http/reports-api.service.ts` — `ReportEvent`/`ReportEventsResponse` + `events()`.
- `features/reports/reports.store.ts` — `role`/`viewer`/`events` + `gran`/`cursor`;
  computed `report`, `atCurrentPeriod`, `canStepForward`; `setRole` seeds from route.
- `pages/reports/reports-page.component.ts` — rebuilt as the Accordion config:
  header card, period bar (segmented + stepper + „Heute"), 3 stat cards, nested
  group/leaf/event rows (no bars, compact spacing), tinted totals chips, export
  menu (CSV implemented w/ BOM; PDF item + „bald" badge), `calendar-x`-less empty state.
- Routing: `/reports/experts` + `/reports/students` (redirect from `/reports`),
  `permissionGuard` + `data.role`. Shell: two nav items role-gated so each user
  sees the one matching their role. i18n de/en/fr fully reworked (German mirrors handoff).

## Verification
- `go build ./...`, `go vet ./internal/reports/...`, `go test ./... -count=1` — pass.
- `go test -tags=integration ./internal/reports/...` — pass.
- `pnpm run build` / `lint` / `test:ci` (95 tests, incl. new util + store) — pass.
- Not done: live visual check (needs full stack + WorkOS auth).

## Deviations from handoff (minor, intentional)
- Empty state reuses `z-empty-state` (inbox icon) per the project's reuse rule,
  not a bespoke `calendar-x` block.
- Two routes are role-gated in nav (a user has one role); deep-linking the other
  route shows the user's own data under that perspective.

## Added after review
- CSV-export confirmation toast via `AppShellStore.showToast` (the shell renders
  it): „CSV exportiert — {{count}} Einträge · {{period}}" (de/en/fr).

## Follow-ups
- WorkOS: assign `reports:read` to expert/student roles (config).
- Run `POST /internal/assets/durations/backfill` once for historical durations.
- Phase 2: PDF export („bald" shown); optional CSV toast.
