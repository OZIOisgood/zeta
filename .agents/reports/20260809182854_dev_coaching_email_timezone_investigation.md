# Dev coaching email timezone investigation

## Context

Screenshots from 2026-08-04 show coaching sessions at 18:45/19:30/20:00 in the dashboard, while German emails describe 16:45/17:30/18:00 UTC. Research only: dev DB and dev Cloud Run logs were inspected read-only; no application data or runtime configuration was changed.

## Findings

- The three non-cancelled `Reitstunde` bookings are stored correctly as absolute instants:
  - Wild F.: 16:45 UTC = 18:45 Europe/Berlin, 45 min.
  - Milla W.: 17:30 UTC = 19:30 Europe/Berlin, 30 min.
  - Inge N.: 18:00 UTC = 20:00 Europe/Berlin, 30 min.
- All three students and their common coach currently have `language=de`, `timezone=Europe/Berlin`, and coaching booking/reminder emails enabled. The coach's preferences were updated after the incident; preference history is not stored.
- Reminder rows were created at the expected offsets and marked sent close to their due times. The last booking correctly has only 1 h and 15 min reminders because it was booked less than 24 h before the session.
- Dev logs show the last booking POST returning 201 at 15:19:46 UTC, two German confirmation sends succeeding, and the coaching success event recording `Tuesday, August 4, 2026 at 18:00 UTC`. Both later reminder runs also show two successful sends and no send error.
- The incident ran on revision `zeta-api-dev-00095-r86`. The enabled reminder scheduler polls every five minutes in UTC; no scheduler warning/error executions or relevant coaching email failures were found for 2026-08-03 through 2026-08-05.
- Storage, slot validation, reminder scheduling, and dashboard display are instant-safe. The defect is email presentation: confirmation, cancellation, and reminder code explicitly calls `.UTC()` and formats a literal English date plus `UTC`.
- Confirmation and reminder compute one formatted string before iterating recipients. The current design therefore cannot represent the same instant in different recipient timezones.
- Dynamic duration copy is also hardcoded English (`minutes`, `hour(s)`), explaining `45 minutes` inside the German screenshot.

## Root cause and scope

This is a systemic recipient-localization gap, not corrupt booking data or a bad setting for one user. Every non-UTC recipient of coaching confirmation, cancellation, and reminder emails is presented UTC time. The surrounding template language is localized, but interpolated date/time and duration values are not.

The dev DB currently has no UTC user preferences, and all 156 historical coaching participant occurrences join to non-UTC preferences, so the behavior is broad in dev.

## Recommended fix

1. Resolve language and validated IANA timezone as part of each email target.
2. Use one pure, tested formatter for recipient-local date/time and duration. Include an unambiguous zone name/offset.
3. Format inside the recipient loop, then apply the helper consistently to booking confirmation, cancellation, reminders, and email previews.
4. Fall back to UTC only for missing/invalid legacy data and emit a structured warning without email or raw PII.
5. Add exact content tests for summer and winter DST, different expert/student zones, `de`/`fr`/`en`, duration pluralization, and timezone fallback. No DB migration is needed.

## Adjacent issues (separate scope)

- Reminder state is booking-level for two recipients. A WorkOS lookup failure is skipped and the row can still be marked sent; a transport failure can retry the row and resend to the recipient that already succeeded. Per-recipient delivery state is the durable fix.
- Reminder logs expose only booking-level aggregate completion. Add canonical `scheduled_at`, booking/reminder ID, and per-recipient user ID to structured success events; do not log addresses.
- Booking creation waits synchronously for external email sends; one incident POST took 5.68 seconds. Moving notification delivery to an outbox/worker would separate booking latency and provider reliability.
- Frontend slot grouping derives the calendar day from the browser timezone, while visible time uses the saved profile timezone. Near midnight, a slot can be grouped under the wrong day. Make date-key generation use the profile timezone and add a non-ambient-zone test.

## Relevant code

- `internal/coaching/booking_email.go` (confirmation line 113; cancellation line 241)
- `internal/coaching/reminder.go` (email formatting line 43; scheduling lines 134-148)
- `internal/coaching/helpers.go` (English-only duration lines 78-87)
- `web/dashboard-next/src/app/core/i18n/dashboard-date-time.service.ts`
- `web/dashboard-next/src/app/features/sessions/booking-flow.store.ts` (browser-zone date grouping)
- `cmd/email-preview/main.go` (UTC preview copy)

## Verification

- Read-only Cloud SQL proxy queries against dev; proxy stopped afterward.
- Read-only Cloud Logging queries against `zeta-api-dev` for 2026-08-04.
- `go test ./internal/coaching -count=1` passes, but current tests do not assert localized email content.
- No code, DB, deployment, secret, or runtime changes were made.
