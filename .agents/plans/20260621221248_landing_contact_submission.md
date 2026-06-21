# Landing contact submission

## Context

The public landing contact form is a non-wired demo. It must accept messages without authentication and deliver them through the existing support inbox workflow.

## Decision

- Add a public `POST /contact` API endpoint with validation, request-size limits, a honeypot, and in-memory rate limiting.
- Persist each accepted submission before delivery and track Resend delivery status.
- Send a source-tagged email to `INBOUND_EMAIL_SUPPORT_ADDRESS`; the existing inbound-email pipeline provides the support Discord forum post and `INBOUND_EMAIL_COPY_RECIPIENTS` forwarding.
- Wire localized landing forms to the production API and add accessible pending, success, and failure states.
- Add `LANDING_ORIGIN` as plain runtime config for production CORS.

## Verification

- Focused Go and landing tests.
- `make db:sqlc`, `make api:build`, landing build, workflow YAML parse, and `git diff --check`.

