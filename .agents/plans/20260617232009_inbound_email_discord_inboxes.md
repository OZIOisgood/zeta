# Inbound Email To Discord Inboxes Plan

## Context

Receive customer email through Resend and mirror each supported mailbox into an
environment-specific Discord forum:

| Logical inbox | Production address | Production forum | Development address | Development forum |
| --- | --- | --- | --- | --- |
| Social | `social@strido.net` | `social-inbox` | `social-dev@strido.net` | `social-inbox-dev` |
| Support | `support@strido.net` | `support-inbox` | `support-dev@strido.net` | `support-inbox-dev` |
| DSA | `dsa@strido.net` | `dsa-inbox` | `dsa-dev@strido.net` | `dsa-inbox-dev` |

An optional configured recipient list should also receive forwarded copies of
all supported inbound messages.

## Decision

Use **webhook-first ingestion with polling/reconciliation backup**:

1. Resend sends an `email.received` webhook to the API.
2. The API verifies the Resend/Svix signature against the raw request body.
3. The API persists an idempotent inbox row and returns `200` quickly.
4. A processor fetches the full message from Resend, because the webhook only
   contains metadata, then creates the Discord forum post and optional forwards.
5. A Cloud Scheduler endpoint periodically reconciles recent Resend messages and
   retries rows whose Discord/forward delivery is pending or failed.

Do not perform Discord posting or forwarding before the webhook is durably
recorded. Resend retries and manual replay remain useful, but the database is the
source of truth for deduplication and delivery state.

## Provider And DNS Preflight

Before implementation rollout:

1. Confirm Resend Inbound is enabled for `strido.net`.
2. Confirm the exact receiving MX record shown by the Resend dashboard.
3. Reconcile current DNS. On 2026-06-17, `strido.net` returns three MX records at
   equal priority `0`:
   - `mx1.efwd.spaceship.net`
   - `mx2.efwd.spaceship.net`
   - `inbound-smtp.eu-west-1.amazonaws.com`
4. Do not add another equal-priority MX blindly. Resend documents that competing
   MX records can produce unpredictable delivery. Decide whether Resend owns
   inbound delivery for the root domain or Spaceship forwards these six
   addresses into Resend.
5. Configure separate dev and prod webhook endpoints:
   - `https://api.dev.strido.net/webhooks/resend`
   - `https://api.strido.net/webhooks/resend`

## Backend Scope

Create a separate `internal/inboundemail` package. Reuse or extract the generic
Discord REST forum-posting client from `internal/feedback`; do not mix customer
email records into `feedback_submissions`.

### Data model

Add reversible migrations and sqlc queries for an `inbound_emails` table with:

- internal UUID;
- unique Resend received email ID;
- unique webhook/Svix message ID when present;
- logical inbox (`social`, `support`, `dsa`);
- environment/configured recipient address;
- sender, recipients, subject, message ID, received timestamp;
- normalized plain-text body and attachment metadata;
- processing status and attempt timestamps;
- Discord channel/thread/message IDs, status, and bounded error;
- forwarding status, Resend send/forward ID, and bounded error;
- created/updated timestamps.

Store the normalized content required for retries, but do not store API keys,
signatures, raw cookies, or unbounded raw MIME. Define a retention period before
shipping because these rows contain user PII and DSA/support correspondence.

### Webhook

- Add public `POST /webhooks/resend` before authenticated routes.
- Limit request size and read the raw body once.
- Verify `svix-id`, `svix-timestamp`, and `svix-signature` with
  `RESEND_WEBHOOK_SIGNING_SECRET`.
- Accept only `email.received`; acknowledge unrelated valid events.
- Match the normalized `to` recipients against the configured mailbox routes.
- Ignore unsupported recipients with a structured warning and `200`.
- Upsert by Resend email ID/Svix ID so webhook retries and manual replay cannot
  create duplicate Discord threads.
- Return `200` after persistence; malformed or invalidly signed requests return
  `400`.

### Processing

- Add a Resend receiving client interface to retrieve full body, headers, and
  attachment metadata by received email ID.
- Build a Discord title from inbox, sender display/address, and subject, capped
  to Discord's 100-character thread-name limit.
- Build a sanitized Discord message containing sender, recipients, received
  time, subject, internal inbox ID, and a bounded plain-text body.
- Disable Discord mentions. Never render inbound HTML directly in Discord.
- If the body exceeds Discord's 2,000-character limit, post a concise first
  message and add bounded continuation messages or a text attachment.
- For MVP, list attachment names/types/sizes in Discord and preserve attachments
  in forwarded copies. Uploading attachment binaries to Discord can be a second
  phase after size, malware, and retention rules are defined.
- Mark Discord and forwarding outcomes independently so one can retry without
  duplicating the other.

### Reconciliation

- Add `POST /internal/inbound-email/reconcile`, protected by the existing
  scheduler secret.
- Run every 5-10 minutes in dev and prod through Terraform-managed Cloud
  Scheduler.
- Fetch a bounded recent window from Resend or retrieve known pending IDs,
  upsert missing messages, and retry pending/failed deliveries with backoff.
- Use row locking/claim timestamps so concurrent Cloud Run instances do not
  process the same email simultaneously.
- Alert through structured error logs when a row exceeds the retry threshold.

## Forwarding Copies

Add optional `INBOUND_EMAIL_COPY_RECIPIENTS` as a comma-separated list of valid
addresses. Empty means disabled.

Prefer Resend's receiving forward capability because it preserves original
content and attachments. If the current Go SDK does not expose it, implement the
documented REST call behind an interface instead of reconstructing MIME by
string manipulation. Use `RESEND_FROM_EMAIL` as the forwarding sender unless a
separate verified sender is required.

Prevent loops:

- never route the configured copy recipients back into supported inbound
  addresses;
- add a stable forwarding marker/header when the API controls the outgoing
  message;
- deduplicate by the original Resend received email ID.

## Configuration And Ownership

Secret Manager:

- `RESEND_API_KEY` already exists.
- Add `RESEND_WEBHOOK_SIGNING_SECRET`, separately provisioned for dev and prod
  webhook endpoints and bound through `--set-secrets`.

Plain runtime config:

- `INBOUND_EMAIL_SOCIAL_ADDRESS`
- `INBOUND_EMAIL_SUPPORT_ADDRESS`
- `INBOUND_EMAIL_DSA_ADDRESS`
- `DISCORD_SOCIAL_INBOX_FORUM_CHANNEL_ID`
- `DISCORD_SUPPORT_INBOX_FORUM_CHANNEL_ID`
- `DISCORD_DSA_INBOX_FORUM_CHANNEL_ID`
- `INBOUND_EMAIL_COPY_RECIPIENTS`
- optional retry/window/retention tuning values only if defaults prove
  insufficient

Set the three addresses and forum IDs explicitly per environment in
`deploy-dev.yml` and `deploy-prod.yml`. Keep channel IDs, addresses, and copy
recipient lists as plain config; only the bot token, API key, and webhook signing
secret are secrets.

Update:

- `.env.example`
- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`
- `docs/cicd.md`
- `README.md`
- Resend webhook/domain settings
- registrar DNS
- Terraform dev/prod scheduler jobs
- privacy/legal documentation if retention or forwarding recipients change who
  processes inbound correspondence

Before config edits, run:

```bash
.agents/skills/infra-configuration/scripts/audit_runtime_config.sh \
  RESEND_API_KEY RESEND_WEBHOOK_SIGNING_SECRET \
  INBOUND_EMAIL_SOCIAL_ADDRESS INBOUND_EMAIL_SUPPORT_ADDRESS \
  INBOUND_EMAIL_DSA_ADDRESS INBOUND_EMAIL_COPY_RECIPIENTS \
  DISCORD_SOCIAL_INBOX_FORUM_CHANNEL_ID \
  DISCORD_SUPPORT_INBOX_FORUM_CHANNEL_ID \
  DISCORD_DSA_INBOX_FORUM_CHANNEL_ID
```

## Tests

- Signature verification: valid, invalid, stale/tampered body, missing headers.
- Recipient routing for all six addresses and unsupported recipients.
- Idempotency across duplicate webhook delivery, manual replay, and polling.
- Full-content retrieval, plain-text fallback from HTML, long messages, Unicode,
  empty subject, and attachment metadata.
- Discord success/failure/retry without duplicate threads.
- Forwarding disabled, success, partial failure, loop prevention, and retries.
- Reconciliation claiming/concurrency and retry thresholds.
- Migration/sqlc integration tests for unique constraints and status updates.

Verification:

```bash
make db:sqlc
go test ./internal/inboundemail/... -count=1
make test:unit
make api:build
git diff --check
terraform fmt -check
terraform validate
```

Also parse changed workflow YAML, review Terraform plans, inspect redacted Cloud
Run bindings, verify secret names without reading payloads, send one message to
each dev address, replay one webhook, and confirm exactly one Discord thread and
one forwarded copy per configured recipient.

## Rollout

1. Implement database, clients, verified webhook, routing, and Discord posting.
2. Deploy dev config/secrets and register only the dev webhook.
3. Validate all three `*-dev@strido.net` routes, duplicates, failures, and
   forwarding.
4. Add reconciliation scheduler and prove it recovers an intentionally missed
   webhook.
5. Resolve root-domain MX ownership, then enable production webhook and
   production addresses.
6. Monitor failed/pending counts and logs before declaring the inboxes live.

## Open Decisions

Resolved for phase 1:

- Send one copy of all three inboxes to `pashalobaryev111@gmail.com`.
- Preserve attachments in forwarded copies and publish attachment metadata only
  in Discord.
- Use the supplied environment-specific numeric Discord forum IDs.

Still open before production rollout: define the retention period for stored
message bodies and attachment metadata. The implementation deliberately does
not auto-delete customer correspondence until that policy is approved.

## References

- https://resend.com/docs/dashboard/receiving/introduction
- https://resend.com/docs/dashboard/receiving/custom-domains
- https://resend.com/docs/dashboard/receiving/get-email-content
- https://resend.com/docs/dashboard/receiving/forward-emails
- https://resend.com/docs/webhooks/verify-webhooks-requests
- https://resend.com/docs/webhooks/retries-and-replays
