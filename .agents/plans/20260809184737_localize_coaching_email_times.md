# Localize coaching email times

## Context

Dev bookings store correct UTC instants, but confirmation, cancellation, and reminder emails ignore each recipient's saved timezone and interpolate English date/duration strings into localized copy.

## Decision and scope

- Add one recipient-local formatter using saved language and IANA timezone.
- Format separately for each recipient and include an explicit IANA zone plus UTC offset.
- Localize duration units for English, German, and French.
- Cover confirmation, cancellation, reminders, structured success logs, and email previews.
- Add DST, differing-recipient-zone, locale, and fallback tests.
- Do not include the separate reminder outbox/state redesign or frontend near-midnight grouping fix.

## Verification

- `go test ./internal/coaching -count=1`
- `make email:preview`
- `make test:unit`
- `make api:build`
- `git diff --check`
