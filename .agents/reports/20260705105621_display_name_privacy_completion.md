## Context

Ticket #7 requested display names and stronger member privacy: no user should see
other members' email addresses, experts still need real student names in reports,
and the group details student list may show both display and real names.

## Decision

- Public display names are formatted as `First L.` with `User` fallback.
- Group member APIs no longer include email, first name, or last name fields.
- The student member endpoint includes `full_name` for expert/admin contexts;
  the experts endpoint only includes `display_name`.

## Files Touched

- `internal/preferences/profile.go`
- `internal/users/handler.go`
- `internal/users/handler_test.go`
- `web/dashboard-next/src/app/core/http/groups-api.service.ts`
- `web/dashboard-next/src/app/pages/group-details/group-details-page.component.ts`
- `web/dashboard-next/src/app/pages/group-details/group-details-page.component.spec.ts`
- `README.md`

## Verification

- `go test ./internal/users ./internal/preferences -count=1`
- `pnpm ng test --watch=false --include src/app/pages/group-details/group-details-page.component.spec.ts`
- `make api:build`
- `make web-next:build`
- `make web-next:lint`
- `make test:unit`

## Follow-Ups

- `pnpm test:ci -- <file>` is not compatible with the Angular 21 unit-test
  builder argument parsing; use `pnpm ng test --watch=false --include <file>`
  for focused specs.
