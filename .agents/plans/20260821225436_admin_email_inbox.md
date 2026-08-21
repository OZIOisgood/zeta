# Admin email inbox

## Context

Inbound social, support, and DSA email is already stored durably and mirrored to Discord, but operators can only reply from a personal forwarded mailbox. Replies must be sent from the address that originally received the message and remain visible to other admins.

## Decision and scope

- Add permission-gated admin APIs to list inbound email, view a message, download its attachments, send an idempotent reply through Resend, and update handling status.
- Preserve the existing ingestion table and add reply/status persistence with reversible migrations and sqlc queries.
- Send from the matched route address (`social@`, `support@`, or `dsa@strido.net`) with `In-Reply-To`/`References`, a branded layout, and an audit trail of the admin user.
- Add `/admin/emails`, discoverable from the Admin dashboard/navigation, plus `/admin/support` as a support-filter redirect.
- Build responsive list/detail/composer states with inbox/status filters, skeletons, empty/error states, send feedback, and attachment access.
- Add `inbound-email:read` and `inbound-email:reply` permissions to code and the WorkOS admin role in dev/prod.

## Areas touched

- `db/migrations`, `db/queries`, generated sqlc code
- `internal/inboundemail`, `internal/permissions`, `internal/api`
- `docs/openapi.yaml`, README inbound email documentation
- `web/dashboard-next/src/app` routes, shell/admin navigation, API client, page, tests, and i18n

## Verification

- Narrow Go tests and sqlc generation
- Backend unit tests/build
- Focused dashboard tests, lint, and build
- Permission metadata and admin role assignment verification in WorkOS for configured environments

## Follow-ups

- Rich text, assignment, canned replies, and full multi-message conversation grouping remain outside the initial operational MVP unless required by implementation correctness.
