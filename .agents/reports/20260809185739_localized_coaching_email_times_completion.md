# Localized coaching email times completion

## Context

Coaching confirmation, cancellation, and reminder emails displayed a correct booking instant in hardcoded UTC with English date/duration fragments, ignoring each recipient's saved timezone and language.

## Decision and implementation

- Added a shared recipient-local formatter backed by saved language and IANA timezone.
- Embedded Go timezone data so Cloud Run's minimal Alpine image can resolve IANA locations reliably.
- Rendered weekday, month, date, time, explicit IANA zone, UTC offset, and duration in English, German, or French.
- Moved formatting inside each recipient loop so expert and student can receive different local dates/times for the same booking.
- Applied the formatter to booking confirmation, cancellation, and all reminders.
- Added canonical RFC3339 `scheduled_at` and booking/reminder identifiers to success logs without logging addresses.
- Updated email preview scenarios.
- No DB migration, configuration, permission, deployment, or live-data change was required.

## Files and areas touched

- `internal/coaching/email_localization.go`
- `internal/coaching/booking_email.go`
- `internal/coaching/reminder.go`
- `internal/i18n/locales/email.{en,de,fr}.json`
- coaching localization, booking email, cancellation, and reminder tests
- `cmd/email-preview/main.go`

## Verification

- Locale JSON parsed with `jq`.
- `go test ./internal/i18n ./internal/coaching -count=1`
- `make email:preview`; generated confirmation, cancellation, and reminder HTML contains recipient-local time and localized duration.
- `make test:unit`
- `make api:build`
- `git diff --check`

All verification passed.

## Follow-ups

- Separate task: per-recipient reminder delivery/outbox state and idempotency.
- Separate task: use the saved profile timezone when grouping frontend slots by calendar date near midnight.
