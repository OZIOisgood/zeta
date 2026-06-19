# Inbound Email Discord Inboxes Completion

## Context

Implement Resend inbound handling for social, support, and DSA mail, mirror it
to environment-specific Discord forums, and forward one copy to the configured
recipient.

## Decision And Scope

- Added verified, persist-first `POST /webhooks/resend` ingestion with a fast
  acknowledgement and scheduler-protected
  `POST /internal/inbound-email/reconcile`.
- Persist before delivery; deduplicate by Resend/Svix IDs and claim rows with
  `FOR UPDATE SKIP LOCKED` plus retry backoff.
- Track Discord and forwarding outcomes independently. Forwarding uses a stable
  Resend idempotency key and preserves attachments through signed attachment
  URLs; Discord receives bounded plain text and attachment metadata only.
- Configured the supplied dev/prod forum IDs and
  `pashalobaryev111@gmail.com` as the current copy recipient.
- Extracted the reusable Discord forum client and upgraded Resend Go SDK v2 to
  v3 for official Receiving API and webhook verification support.
- Updated runtime ownership docs, architecture/data-flow docs, and privacy text
  in all five landing locales.

## Files And Areas

- `internal/inboundemail`, `internal/discord`, `internal/api`
- `db/migrations`, `db/queries`, generated sqlc models/queries/mocks
- `.env.example`, dev/prod deploy workflows, dev/prod Terraform schedulers
- `README.md`, `docs/cicd.md`, landing privacy content

## Verification

- `make db:sqlc`
- `go test ./internal/inboundemail -count=1`
- targeted Postgres integration test for idempotent upsert/claim
- `make test:unit`
- `make test:integration`
- `make api:build`
- landing `pnpm test` and `pnpm run build`
- workflow YAML parse
- `terraform fmt -check -recursive infra/terraform`
- `terraform validate` in dev and prod
- reviewed real dev/prod Terraform plans; no apply performed
- read-only Discord API checks confirmed all six IDs are forum channels
  (`type=15`) and the matching environment bot can access them
- `git diff --check`

## Rollout Follow-Ups

- Replacement dev and prod Resend API keys were validated against the Resend
  API on 2026-06-19. A new dev secret version was added and the prod secret was
  created in Google Secret Manager; the local `.env` now uses the dev key.
- The dev webhook signing secret is present in local `.env` and
  `zeta-dev-resend-webhook-signing-secret`. The endpoint-specific prod secret is
  present as `zeta-prod-resend-webhook-signing-secret`.
- Resolve the three equal-priority root MX records before enabling inbound mail.
- The inbound reconciliation scheduler is defined for every five minutes but is
  not present in live GCP yet. The dev plan's Cloud Run scaling diff is provider
  normalization around explicit zero values; live scaling remains API 0-3 and
  dashboard 0-2. Prod remains a 34-resource baseline rollout. Neither plan was
  applied.
- Deploy the API before creating/enabling reconciliation jobs and webhooks.
- Approve a retention period before production; automatic deletion is
  deliberately not implemented yet.
