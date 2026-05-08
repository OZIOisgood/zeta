# Task: implement email templating

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a Zeta user, I want transactional emails to use branded HTML templates instead of plain text so invitations, video updates, and coaching notifications are easier to scan and recognize.

## Context
- Existing email delivery is implemented in `internal/email/service.go` through Resend.
- Current notification producers are in `internal/invitations`, `internal/assets`, `internal/users`, and `internal/coaching`.
- The dashboard uses Taiga UI styling tokens and a restrained blue action color. Email CSS must approximate this visual language with email-safe static values because most email clients do not support runtime dashboard CSS variables reliably.
- The feature does not require new permissions. It reuses existing notification preference checks and delivery paths.
- Automated tests are required because template rendering and CSS inlining are shared email infrastructure.

## Acceptance Criteria
- [x] Emails can be rendered with `html/template` and embedded template files.
- [x] A shared layout is used for notification emails.
- [x] CSS is embedded and inlined before delivery.
- [x] Existing notification emails use templated HTML delivery with text fallback.
- [x] A local preview mode renders fake data and writes final HTML previews.
- [x] API build and unit tests pass.
