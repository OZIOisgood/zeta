## Context

Implemented the user profile source-of-truth refactor from the investigation in `20260605174002_user_preferences_source_of_truth_investigation.md`.

## Decision

`user_preferences` is now canonical for display profile fields after the first `/auth/me` seed. WorkOS still provides auth/session data, recipient email, and org membership role, and profile saves still push names to WorkOS asynchronously.

## Files Touched

- `db/queries/users.sql`, `db/queries/coaching.sql`
- Generated sqlc and db mock files under `internal/db/`
- Auth profile read/update flow in `internal/auth/handler.go`
- Group member display resolution in `internal/users/handler.go`
- Coaching user resolution and booking/expert responses under `internal/coaching/`
- Notification display names in `internal/assets/handler.go` and `internal/invitations/handler.go`
- Preference helpers in `internal/preferences/`
- Frontend avatar-clearing payload in `web/dashboard-next/src/app/pages/preferences/preferences-page.component.ts`
- Updated affected unit tests.

## Verification

- `go test ./... -count=1`
- `make web-next:lint`
- `make web-next:build`
- `make api:build`

Angular build still reports existing bundle/CommonJS warnings for Agora-related dependencies.

## Follow-Ups

- Consider adding dedicated auth handler tests for first-login seeding and `/auth/me` returning preference names.
- Consider invalidating open video review state after profile save if live comment author names should update without navigating/reloading.
