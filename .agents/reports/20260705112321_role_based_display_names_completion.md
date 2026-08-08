## Context

Follow-up to ticket #7: experts should be visible by real professional names,
students should have editable display names, and emails must remain hidden from
member lists.

## Decision

- Added `user_preferences.display_name`, defaulted/backfilled to `First L.`.
- Students are listed by editable `display_name`; expert/admin callers also get
  student `full_name` for the secondary line.
- Experts/admins are listed by real full name for every viewer with expert-list
  permission.
- Dashboard Preferences shows display-name editing only to students.

## Files Touched

- `db/migrations/20260705111725_add_user_display_name.*.sql`
- `db/queries/users.sql`
- `internal/auth/handler.go`
- `internal/preferences/profile.go`
- `internal/users/handler.go`
- `web/dashboard-next/src/app/core/http/auth-api.service.ts`
- `web/dashboard-next/src/app/pages/preferences/preferences-page.component.ts`
- `web/dashboard-next/src/app/pages/group-details/group-details-page.component.ts`
- `web/dashboard-next/public/i18n/*.json`
- `README.md`

## Verification

- `make db:sqlc`
- `go test ./internal/auth ./internal/users ./internal/preferences -count=1`
- `pnpm ng test --watch=false --include src/app/pages/preferences/preferences-page.component.spec.ts --include src/app/pages/group-details/group-details-page.component.spec.ts`
- `make api:build`
- `make test:unit`
- `make web-next:lint`
- `make web-next:build`

## Follow-Ups

- No new permission was added; display-name editing is role-based for students.
