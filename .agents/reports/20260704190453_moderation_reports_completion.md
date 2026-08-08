# Moderation Reports Completion

## Context

Ticket #18 requested user/comment reporting from the comment kebab menu and an
admin-only place to review reports.

## Scope

- Added `moderation_reports` persistence, sqlc queries, and `internal/moderation`
  API handlers.
- Added permissions:
  - `moderation:reports:create`
  - `moderation:reports:read`
  - `moderation:reports:update`
- Added Discord forum mirroring through the existing API-side Discord poster.
  No email delivery was added, matching the current feedback inbox behavior.
- Added comment/report UI from the existing comment actions menu.
- Added `/admin` as an admin landing page and `/admin/reports` as the report
  inbox.
- Added `/admin/reports` with filters, report context, reported comment
  snapshot, and one-way status triage from `open` to `resolved` or `rejected`.
- Added `DISCORD_MODERATION_REPORTS_FORUM_CHANNEL_ID` as plain runtime config:
  - dev/report-inbox-dev: `1523004466973114569`
  - prod/report-inbox: `1523004422643515543`

## WorkOS

Using the current `.env` `WORKOS_API_KEY`, the three moderation permissions were
created and assigned additively:

- `moderation:reports:create`: admin, expert, student
- `moderation:reports:read`: admin
- `moderation:reports:update`: admin

The role assignments were verified through the WorkOS API without printing
secret payloads.

## Verification

- `make db:migrate:down`
- `make db:sqlc`
- `make db:migrate:up`
- `make api:build`
- `go test ./internal/moderation ./internal/reviews -count=1`
- `make test:unit`
- `CI=true make web-next:lint`
- `CI=true make web-next:build`
- `CI=true make web-next:test`
- `git diff --check`
- YAML parse for `.github/workflows/deploy-dev.yml` and
  `.github/workflows/deploy-prod.yml`

Frontend build still reports pre-existing bundle/CommonJS warnings for pdfmake,
Agora/WebRTC dependencies, and the current initial bundle budget.

## Follow-Up Fixes

- Blocked self-reporting in both backend validation and the comment actions UI.
- Removed the reports page refresh button, Discord status display, open context
  action, resolution note, and save button.
- Removed `reviewing`/`declined` moderation states in favor of `open`,
  `resolved`, and `rejected`.
- Reworked the moderation migration by downing it locally, rewriting it with
  `target_review_content`, and applying it again.
- Added the local moderation Discord channel ID to `.env`; new reports will post
  after the API process is restarted with that environment.

## Follow-Ups

- After deploy, verify Cloud Run has the new
  `DISCORD_MODERATION_REPORTS_FORUM_CHANNEL_ID` env var in dev/prod.
- Users may need to refresh/re-login after WorkOS permission changes so JWT
  permission claims include the new slugs.
