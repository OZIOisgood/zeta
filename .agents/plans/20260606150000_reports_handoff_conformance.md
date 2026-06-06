# Reports — Handoff-Conformance Rebuild

## Context
The shipped reports UI (`pages/reports/reports-page.component.ts`) renders two
period-grouped HTML **tables**. The design handoff
(`docs/handoffs/design_handoff_reports/`) locks **one** configuration:
**Liste (Accordion) · Kompakt · ohne Balken**, with two role pages, a period
stepper, stat cards, totals chips, and an export menu. The table layout is the
explicitly forbidden variant. User confirmed: **ohne Balken**, build
**handoff-conform**.

The current backend pre-aggregates into buckets, which cannot render the
accordion's per-event rows (title + timestamp per video/coaching). So the
response shape must become **event-level**; the frontend ports `buildReport()`
and does nesting/aggregation/period-stepping client-side (matches the prototype,
gives instant ‹ › stepping with no refetch).

## Keep (already correct)
- Migration `videos.duration_seconds` + Mux duration capture in
  `internal/assets/handler.go` + backfill endpoint.
- Permission `reports:read`.
- `user_preferences` name resolution (`nameResolver`).

## Backend changes
Replace the aggregate summary with an **events** endpoint.

- `db/queries/reports.sql` — replace the 4 bucket queries with 4 event queries:
  - `ReportUploadEventsForExpert` — assets in groups the expert owns
    (`g.owner_id = @expert_id`, `status != 'waiting_upload'`), one row per asset:
    `a.id, a.name AS title, a.created_at AS at, a.group_id, g.name, a.owner_id AS student_id, g.owner_id AS expert_id, COALESCE(SUM(v.duration_seconds),0) AS duration_seconds` (GROUP BY asset).
  - `ReportUploadEventsForStudent` — `a.owner_id = @student_id`; leaf expert = `g.owner_id`.
  - `ReportSessionEventsForExpert` — `cb.expert_id = @expert_id`, not cancelled,
    `scheduled_at < now()`, JOIN `coaching_session_types st` for `st.name AS title`,
    fields: `cb.id, st.name, cb.scheduled_at, cb.group_id, g.name, cb.student_id, cb.expert_id, cb.duration_minutes`.
  - `ReportSessionEventsForStudent` — `cb.student_id = @student_id`.
  - No date filtering (return all history; frontend filters by period). Order newest-first.
- `make db:sqlc`.
- `internal/reports/handler.go` — `GET /reports/events`:
  - Resolve role from `user.Role` (student vs expert/admin).
  - Build a unified `[]event` with `{kind, group{id,name}, student{id,name}, expert{id,name}, title, at (RFC3339), duration_seconds}`.
  - Resolve student/expert names via `nameResolver`; include `viewer{id,name}`.
  - Drop the bucket/period/tz/from-to machinery (period now client-side).
- `internal/reports/handler_test.go` + `integration_test.go` — update to the new shape.

## Frontend changes
- `core/http/reports-api.service.ts` — replace bucket types with:
  `ReportEvent { kind:'video'|'live'; group:Ref; student:Ref; expert:Ref; title:string; at:string; durationSeconds:number }`
  and `ReportEventsResponse { role; viewer:Ref; events:ReportEvent[] }`;
  method `events()`.
- `features/reports/reports.util.ts` (new) — port from `reference-src`:
  - period model `{gran,year,month,quarter}` + `eventInPeriod`, `stepPeriod`,
    `granToPeriod`, `periodLabel`, `periodSubLabel` (reports-data.jsx).
  - `buildReport(role, events, period)` → `{groups:[{id,name,totals,leaves:[{id,name,totals,events}]}], totals, count, leafLabel}` (reports-views.jsx).
  - formatters `fmtDuration`, `fmtEventDuration`, `fmtDayTime` — locale-aware
    (unit strings via Transloco; month/day via `DashboardDateTimeService`).
- `features/reports/reports.store.ts` — hold `role`, `gran`, `cursor{year,month}`,
  loaded `events`, async slice; computed `period` and `report = buildReport(...)`.
  Fetch once per visit.
- `pages/reports/reports-page.component.ts` — rebuild as the **Accordion** config:
  page-header card, period bar (segmented `z-segmented-control` + stepper ‹ ›
  with `calendar-days` label + **Heute**), 3 stat cards, accordion
  group/leaf/event rows (no bars), totals chips, export menu (`z-button` +
  popover → CSV implemented via `exportCsv()`, PDF item with "bald" badge),
  empty state (`calendar-x`). Compact spacing per handoff §Compact density deltas.
  Reuse `z-*`: segmented-control, badge, avatar, empty-state, button, icon-button.
- Routing: two routes (`/reports/experts`, `/reports/students`) via route
  `data.role`, each `permissionGuard` `reports:read`. Component reads role from route.
- Shell nav: two items under a "Berichte" group — Experten-Bericht (`bar-chart-3`),
  Schüler-Bericht (`user-round`); gate both on `reports:read`.
- i18n de/en/fr: full `reports.*` (titles, descriptions, units, export, empty).
  German copy mirrors the handoff verbatim.

## Verification
- `go build ./...`, `go vet ./internal/reports/...`, `go test ./... -count=1`,
  `go test -tags=integration ./internal/reports/...`.
- `make web-next:build`, `make web-next:lint`, `make web-next:test`.
- Manual: both routes, period stepping + Heute (next disabled at current),
  accordion default-open (first group + first leaf), CSV export, empty state.

## Follow-ups (unchanged)
- WorkOS role assignment of `reports:read`; one-off duration backfill run.
- Phase 2 PDF export ("bald" badge shown now).
