# Student Group Leave

## Context

Students needed a way to leave a joined group from the dashboard. The backend did not expose a self-service leave endpoint, and the product rule is that a user cannot leave when they are the last member of the group.

## Decision

Added a dedicated `groups:membership:leave` permission and `DELETE /groups/{groupID}/membership` endpoint. The endpoint requires current membership, blocks group owners, blocks the last remaining member, and removes only the authenticated user.

The dashboard exposes the action in the specific group's Preferences danger zone for users with the new permission, using a confirmation dialog and updating the local groups store after success.

## Files Touched

- `internal/groups/handler.go`
- `internal/groups/handler_test.go`
- `internal/permissions/permissions.go`
- `internal/api/server.go`
- `db/queries/groups.sql`
- `internal/db/groups.sql.go`
- `internal/db/querier.go`
- `internal/db/mocks/mock_querier.go`
- `web/dashboard-next/src/app/core/http/groups-api.service.ts`
- `web/dashboard-next/src/app/features/groups/groups.store.ts`
- `web/dashboard-next/src/app/pages/group-details/group-details-page.component.ts`
- `web/dashboard-next/src/app/pages/group-preferences/group-preferences-page.component.ts`
- `web/dashboard-next/public/i18n/{en,de,fr}.json`
- `README.md`

## Verification

- `go test ./internal/groups -count=1`
- `make db:sqlc`
- `make api:build`
- `pnpm exec ng test --include=src/app/app.routes.spec.ts --include=src/app/pages/preferences/preferences-page.component.spec.ts --include=src/app/pages/group-preferences/group-preferences-page.component.spec.ts --include=src/app/pages/group-details/group-details-page.component.spec.ts --include=src/app/features/groups/groups.store.spec.ts`
- `pnpm run lint`
- `pnpm run build`
- `make mocks`
- `make test:unit` was attempted; it failed in `internal/email` because the test expected the dev logo URL while this environment rendered the localhost logo URL. The touched `internal/groups` package passed.

## Follow-ups

- Add `groups:membership:leave` to the student role in WorkOS/role configuration before relying on the UI in deployed environments.
