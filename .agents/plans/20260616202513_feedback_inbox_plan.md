# Feedback Inbox Plan

## Context

Add a simple in-app feedback button and form to the authenticated dashboard.
Submitted feedback should be persisted in Postgres and mirrored into the
environment-specific Discord forum channel:

- dev: `feedback-inbox-dev` (`1516505542258856137`)
- prod: `feedback-inbox` (`1516499707550240818`)

## Deployment Decision

Phase 1 should not deploy a separate long-running Discord bot service. The
existing Go API should own feedback intake and call Discord's REST API to create
a new forum thread/post after the database write.

Why:

- Creating a forum post is a server-to-server REST operation, so Cloud Run API
  already has the right request lifecycle and observability.
- The app needs durable database state even if Discord is temporarily
  unavailable.
- This keeps infra small now while leaving room for a future Discord
  interactions/gateway worker when slash commands or reply-reading are needed.

Future phase:

- Add a separate Discord interactions endpoint or bot worker only when we need
  slash commands, button interactions, or chat reply ingestion.
- At that point, use the Discord public key for request signature verification
  and decide whether interactions can be handled by the API or need a dedicated
  service.

## Backend Scope

1. Add reversible migrations for a `feedback_submissions` table.
   Proposed columns:
   - `id uuid primary key`
   - `user_id text not null`
   - `user_display_name text not null`
   - `rating integer not null check (rating between 1 and 5)`
   - `message text not null`
   - `page_url text`
   - `user_agent text`
   - `discord_status text not null default 'pending'`
   - `discord_channel_id text`
   - `discord_thread_id text`
   - `discord_message_id text`
   - `discord_error text`
   - `created_at timestamptz not null default now()`
   - `updated_at timestamptz not null default now()`
2. Add sqlc queries in `db/queries/feedback.sql`.
3. Add `internal/feedback` package with:
   - request validation and max lengths;
   - `POST /feedback` protected route;
   - DB insert first;
   - Discord forum post creation after insert;
   - best-effort update of Discord IDs/error onto the feedback row.
4. Add a small Discord REST client interface so handler tests can mock it.
5. Logging:
   - stable events such as `feedback_submission_created` and
     `feedback_discord_post_failed`;
   - include `component=feedback`, feedback ID, Discord thread/message IDs when
     available;
   - do not log raw message body, full email, bot token, or request cookies.
6. Decide failure behavior:
   - recommended: return success once DB save succeeds, even if Discord fails;
   - record Discord failure in DB and log it for follow-up.

## Discord Config And Secrets

Required:

- `DISCORD_BOT_TOKEN`: secret payload, Google Secret Manager, bound with
  `--set-secrets`.
- `DISCORD_FEEDBACK_FORUM_CHANNEL_ID`: plain runtime config, one value per
  environment, bound with `--set-env-vars`.
- `DISCORD_APPLICATION_ID`: plain runtime config.
- `DISCORD_PUBLIC_KEY`: plain runtime config; public by design, needed later for
  interaction signature verification.

The provided Application ID and Public Key are not enough to post to Discord.
The implementation still needs the bot token to be provisioned as a Secret
Manager version.

Secret names:

- `zeta-dev-discord-bot-token`
- `zeta-prod-discord-bot-token`

Deployment updates:

- `.env.example`
- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`
- `docs/cicd.md`

Before editing/applying infra, run:

```bash
.agents/skills/infra-configuration/scripts/audit_runtime_config.sh \
  DISCORD_BOT_TOKEN DISCORD_FEEDBACK_FORUM_CHANNEL_ID \
  DISCORD_APPLICATION_ID DISCORD_PUBLIC_KEY
```

## Frontend Scope

1. Add a global authenticated feedback widget in the dashboard shell.
2. Use existing shared UI primitives:
   - `z-icon-button` or compact fixed edge button with lucide icon;
   - `z-action-dialog`;
   - `z-textarea`;
   - existing toast mechanism for success/error.
3. Keep form intentionally small:
   - 1-5 rating selector;
   - feedback textarea;
   - optional automatic `page_url` from the current route/location.
4. Add `FeedbackApiClient` under `web/dashboard-next/src/app/core/http`.
5. Add Transloco copy in `public/i18n/en.json`, `de.json`, and `fr.json`.
6. Add focused shell/widget tests for open, submit, disabled state, success, and
   API error.

## UX Notes

- Button should be globally visible in authenticated app, placed bottom-right on
  desktop and safe-area aware on mobile.
- Avoid a marketing-style feedback card. This is an operational dashboard
  control.
- Keep it accessible: keyboard open/close, focus trap via dialog primitive,
  clear label, no overlap with toast and mobile navigation.

## Verification

Backend:

- `make db:sqlc`
- focused Go tests for `internal/feedback`
- `make api:build`
- `make test:unit` if time/blast radius permits

Frontend:

- focused Angular tests for feedback API/widget
- `make web-next:lint`
- `make web-next:build`

Infra:

- `git diff --check`
- YAML parse for changed workflows
- redacted Cloud Run env/secret binding verification after deploy
- `gcloud secrets describe` by name only, never reading secret payloads

## Open Questions

1. Bot token still needs to be provisioned as `zeta-dev-discord-bot-token` and
   `zeta-prod-discord-bot-token`. The Application ID/Public Key are public
   config and not sufficient for posting.
2. GCP Secret Manager containers/versions should be verified before deployment;
   do not read or print the token payload.
