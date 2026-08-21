# Admin email inbox completion

## Outcome

Added a permission-gated admin email client for social, support, and DSA messages. Admins can filter and read inbound messages, open attachments, change handling status, and send branded threaded replies from the exact Strido address that received the original email. `/admin/emails` is linked from primary navigation and the Admin dashboard; `/admin/support` opens the same page pre-filtered to Support.

## Files touched

- Added reversible inbox/reply persistence migration, sqlc queries, and generated database code.
- Added authenticated admin email API routes, Resend reply/attachment support, threading headers, idempotency, and tests.
- Added WorkOS permissions `inbound-email:read` and `inbound-email:reply` and additively assigned both to the admin role in dev and prod.
- Added Angular API client, responsive inbox/detail/composer page, navigation, routes, tests, and EN/DE/FR copy.
- Updated OpenAPI and README inbound-email flow documentation.

## Verification

- `make api:build`: passed.
- `make test:unit`: passed.
- `make db:sqlc`: passed.
- `go test -tags=integration ./internal/inboundemail -run '^$' -count=1`: package compiles.
- Full integration execution was attempted but the testcontainers PostgreSQL could not start because the local Docker daemon was unavailable.
- Dashboard Prettier check: passed.
- Dashboard full test suite: 52 files / 194 tests passed.
- Dashboard production build: passed with existing bundle-size/CommonJS warnings.
- Redocly OpenAPI lint: valid, with existing policy warnings plus the intentional attachment `302` redirect warning.
- `git diff --check`: passed.

## Follow-ups

- Apply the new migration during normal deployment.
- Rich text, assignment, canned replies, and full conversation grouping remain optional post-MVP improvements.
