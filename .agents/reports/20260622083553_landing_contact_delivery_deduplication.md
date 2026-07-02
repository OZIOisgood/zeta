# Landing contact delivery deduplication

## Context

Landing contact submissions produced duplicate copy-recipient emails and duplicate Discord posts because the contact handler sent direct copies and posted to Discord in addition to the established inbound support-email pipeline.

## Decision

- Keep the support inbox as the single internal fan-out path. It owns the configured forward and the consistently formatted Discord forum post.
- Remove direct CC recipients and direct Discord posting from the landing contact handler.
- Send a separate branded, localized acknowledgment to the submitted email address.
- Treat acknowledgment failure as non-fatal after the support message has been delivered and persisted.

## Files touched

- Contact handler, Resend sender, server wiring, and focused tests under `internal/contact` and `internal/api`.
- Contact acknowledgment translations for `de`, `en`, `es`, `fr`, and `nl` under `internal/i18n/locales`.
- Landing contact behavior summary in `README.md`.

## Verification

- `go test ./internal/contact ./internal/i18n -count=1`
- `make api:build`
- `make test:unit`
- `cd web/landing && npm test && npm run build`
- `git diff --check`

## Follow-ups

Deploy the API to dev before repeating the live curl test. A submitter who is also configured as an inbound copy recipient will intentionally receive both the internal forwarded copy and the distinct sender acknowledgment.
