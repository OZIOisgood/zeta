# Landing contact submission completion

## Context

The static landing contact form was a demo and discarded submissions.

## Decision

- Added unauthenticated `POST /contact` with strict validation, a 16 KiB body limit, honeypot handling, and a three-per-ten-minute client rate limit.
- Persisted submissions and Resend delivery state in `landing_contact_submissions` without logging contact PII.
- Sent source-tagged, replyable email to `INBOUND_EMAIL_SUPPORT_ADDRESS`. The established inbound support flow owns the Discord forum post and forwarding to `INBOUND_EMAIL_COPY_RECIPIENTS`, avoiding duplicate threads.
- Wired all localized landing forms with accessible sending, success, and failure states.
- Added the plain production `LANDING_ORIGIN` CORS binding. Dev uses the existing localhost origins because there is no dev landing service.

## Files

- Backend: `internal/contact`, `internal/api/server.go`
- Database: contact migration, sqlc query/output, regenerated db mock
- Landing: contact form generator/tests, `site.js`, legal styles and locales
- Config/docs: `.env.example`, prod deploy workflow, README, `docs/cicd.md`

## Verification

- `make db:sqlc`
- `make api:build`
- `make test:unit`
- `make test:integration`
- Landing `node --test` (22 passing) and site build (5 locales)
- Prod workflow YAML parse and `git diff --check`
- Runtime config audit completed. Live Cloud Run inspection was not possible because the locally selected gcloud project does not contain `zeta-api-prod`; no live change was attempted.

## Deployment

Release the API migration and service before or together with publishing the landing bundle so the new form does not briefly target a missing endpoint.
