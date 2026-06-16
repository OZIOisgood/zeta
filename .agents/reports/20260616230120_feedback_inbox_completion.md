# Feedback Inbox Completion

## Context

Implemented authenticated dashboard feedback intake with durable Postgres
storage and best-effort Discord forum mirroring.

## Scope

- Added `feedback_submissions` migration and sqlc queries.
- Added `internal/feedback` handler and Discord forum REST client.
- Registered protected `POST /feedback`.
- Added dashboard shell feedback widget with 1-5 rating and textarea.
- Added API client, shell tests, and en/de/fr translations.
- Added deploy bindings for dev/prod Discord forum channel IDs and public bot
  metadata.
- Bound `DISCORD_BOT_TOKEN` to Secret Manager names in deploy workflows.

## Verification

- `make db:sqlc`
- `go run go.uber.org/mock/mockgen -source=internal/db/querier.go -destination=internal/db/mocks/mock_querier.go -package=mocks`
- `go test ./internal/feedback -count=1`
- `make api:build`
- `make test:unit`
- `cd web/dashboard-next && pnpm ng test --include src/app/core/shell/shell.component.spec.ts --watch=false`
- `make web-next:lint`
- `make web-next:test`
- `make web-next:build`
- `git diff --check`
- YAML parse for `.github/workflows/deploy-dev.yml` and `.github/workflows/deploy-prod.yml`

## Follow-Ups

- Secret Manager containers `zeta-dev-discord-bot-token` and
  `zeta-prod-discord-bot-token` do not exist in project `zeta-491012` yet.
  Create them and add token versions before deploying these workflow changes.
- `make web-next:build` passes with pre-existing bundle budget/CommonJS warnings.
