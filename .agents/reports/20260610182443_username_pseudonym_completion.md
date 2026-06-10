# Username / pseudonym completion

## Context

Implemented public usernames so users can operate under a pseudonym and email addresses are not shown to other users.

## Scope

- Added `user_preferences.username` migration, validation, backfill, unique index, sqlc queries, and generated DB code/mocks.
- Added username generation and update validation to `/auth/me`.
- Switched public display identity to username in profile helpers, review authors, group members, coaching, reports, notifications, and related emails.
- Removed email, first name, and last name from group member list responses.
- Added username editing to dashboard Preferences and updated dashboard API types/display logic.
- Updated README public identity notes and tests.

## Verification

- `make db:sqlc`: passed.
- `go run go.uber.org/mock/mockgen -source=internal/db/querier.go -destination=internal/db/mocks/mock_querier.go -package=mocks`: passed.
- Focused Go packages: `go test ./internal/preferences ./internal/auth ./internal/users ./internal/reviews ./internal/coaching ./internal/reports ./internal/assets ./internal/invitations -count=1`: passed.
- `make api:build`: passed.
- `make web-next:lint`: passed.
- `make web-next:build`: passed with existing bundle/CommonJS warnings.
- `make web-next:test`: passed, 35 files / 105 tests.
- `make test:unit`: failed only in `internal/email` because `TestRenderNotificationTemplateInlinesCSS` expected `https://dev.zeta.m4xon.com/app-full-icon.png` but rendered `http://localhost:4200/assets/brand/mark/zeta-horse-mark-orange-128.png`.

## Follow-ups

- Decide whether first and last name should remain required private profile fields now that username is the public identifier.
- Investigate the unrelated email template logo URL expectation in `internal/email`.
