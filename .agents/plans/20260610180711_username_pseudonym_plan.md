# Username / pseudonym plan

## Context

Discussion on 2026-06-06 through 2026-06-10 concluded that Zeta must support a user-editable pseudonym and must not show email addresses to other users. The current app uses `user_preferences.first_name` / `last_name` as display profile fields and falls back to email in several dashboard surfaces.

## Decision

Add `username` to `user_preferences` as the public user identifier. Keep email in `/auth/me` for the signed-in user's own account data and for delivery-only backend flows, but remove email from cross-user API responses and UI surfaces.

Default username generation should be deterministic and boring:

- Prefer lowercase `first.lastInitial`, for example `pavlo.l`.
- Normalize unsupported characters out of the default candidate.
- If the candidate is empty or already taken, append a short neutral suffix derived from the user id or retry with a numeric suffix.
- Let users change the username in Preferences.

Validation should be shared conceptually across backend and frontend:

- 3-30 characters.
- Lowercase letters, numbers, `.`, `_`, `-`.
- No email-like values and no leading/trailing separator.
- Case-insensitive uniqueness in the database.

## Backend scope

- Add migration for `user_preferences.username`, backfill existing rows, add a case-insensitive unique index, and add validation/check constraints where practical.
- Update `db/queries/users.sql` seed/update queries and add username lookup/availability queries.
- Run `make db:sqlc` and update generated mocks.
- Update `/auth/me` and `PUT /auth/me` to return and update `username`.
- Update profile helper functions in `internal/preferences` so public display names use `username`.
- Update cross-user responses:
  - `internal/users/handler.go`: group students/experts must return `username` and not `email`.
  - `internal/reviews/handler.go` and `db/queries/video_reviews.sql`: review author display uses username.
  - `internal/coaching/*`: experts, bookings, notifications, and booking display names use username.
  - `internal/reports/handler.go`: report user refs use username.
  - invitation/upload/review/member notifications and emails should use username for another user's display identity.
- Keep WorkOS email lookup for invitation delivery and notification delivery, but do not expose it in cross-user JSON.

## Frontend scope

- Add `username` to `AuthApiClient.User` and `UpdateUserRequest`.
- Add a username field to Preferences personal data using existing `z-text-input`, Transloco copy, and strict-template-friendly validation.
- Update `SessionStore.displayName()` to prefer username over full name/email.
- Update group member types and group details UI to display username and remove `member.email`.
- Update review, coaching, booking, report, notification, and tests/types that assume first/last display names.
- Keep showing the signed-in user's own email in the account menu if desired, because that is not a cross-user leak.

## Verification

- Backend focused tests for auth profile update, group member listing, review author rendering, coaching user resolution, and report refs.
- `make db:sqlc`
- `make test:unit`
- Frontend focused specs for preferences/session/group details/coaching surfaces.
- `make web-next:lint`
- `make web-next:build`

## Open questions

- Should first and last name remain required private profile fields, or should Preferences allow blank names now that username is the public identifier?
- Should admins ever see member emails inside an explicit admin-only management view? The current plan says no cross-user email display unless a later product/legal decision explicitly adds an admin-only exception.
