# WorkOS Invite Return State

## Context

Opening `/groups?invite=...` while unauthenticated should return the user to the same invite URL after WorkOS login or registration. In local dev the API is commonly reached through the Angular proxy under `/api`, so `/api/auth/login` redirects to WorkOS and WorkOS calls back to `/api/auth/callback`.

## Decision

Two issues could drop the invite URL:

- The auth return-state cookie was scoped to `Path=/auth`, which is not sent by browsers to `/api/auth/callback`. Moved it to `Path=/` and clear the legacy `/auth` cookie path when setting or clearing auth state.
- The Angular route guards used `router.url` while the attempted navigation was still in progress. On direct loads this could still be `/`, so `/auth/login` received `return_to=/`. Switched guards to `RouterStateSnapshot.url`.

## Files Touched

- `internal/auth/handler.go`
- `internal/auth/handler_test.go`
- `web/dashboard-next/src/app/core/guards/auth.guard.ts`
- `web/dashboard-next/src/app/core/guards/auth.guard.spec.ts`
- `web/dashboard-next/src/app/core/guards/permission.guard.ts`
- `web/dashboard-next/src/app/core/guards/permission.guard.spec.ts`

## Verification

- `go test ./internal/auth`
- `make api:build`
- `pnpm --dir web/dashboard-next exec ng test --watch=false --include 'src/app/core/guards/*.spec.ts'`
- `make web-next:lint`
- `make web-next:build`
