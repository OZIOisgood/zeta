# Group Invite Link Join Flow Completion

## Context

Group invitation links (`/groups?invite=<code>`) were generated, but the new dashboard did not consume the query param. Unauthenticated users also lost the deep link during WorkOS login because `/auth/login` did not pass or validate `state`.

## What Changed

- Added backend WorkOS return-state handling:
  - `/auth/login?return_to=<relative path>` validates the path.
  - API stores return state in a short-lived HttpOnly cookie.
  - WorkOS receives only an opaque random `state`.
  - `/auth/callback` validates state, clears the cookie, and redirects to the original frontend path.
- Added frontend auth preservation:
  - Auth and permission guards pass `Router.url` into `session.login`.
  - `AuthApiClient.getLoginUrl` appends encoded `return_to`.
- Added dashboard invite acceptance flow:
  - `GroupsApiClient` now reads invitation info and accepts invitations.
  - `GroupsPageComponent` opens a join dialog for `/groups?invite=<code>`.
  - Handles loading, already-member, invalid invitation, decline, accept success, and accept failure states.
- Updated group invitation i18n in `en`, `de`, and `fr`.
- Updated README auth redirect preservation docs.

## Files Touched

- `internal/auth/handler.go`
- `internal/auth/handler_test.go`
- `web/dashboard-next/src/app/core/http/auth-api.service.ts`
- `web/dashboard-next/src/app/core/http/auth-api.service.spec.ts`
- `web/dashboard-next/src/app/core/guards/auth.guard.ts`
- `web/dashboard-next/src/app/core/guards/permission.guard.ts`
- `web/dashboard-next/src/app/features/session/session.store.ts`
- `web/dashboard-next/src/app/core/http/groups-api.service.ts`
- `web/dashboard-next/src/app/pages/groups/groups-page.component.ts`
- `web/dashboard-next/public/i18n/en.json`
- `web/dashboard-next/public/i18n/de.json`
- `web/dashboard-next/public/i18n/fr.json`
- `README.md`

## Verification

- `go test ./internal/auth -count=1`
- `go test ./internal/auth ./internal/invitations -count=1`
- `make api:build`
- `PATH=/Users/test/.nvm/versions/node/v20.19.1/bin:$PATH make web-next:lint`
- `PATH=/Users/test/.nvm/versions/node/v20.19.1/bin:$PATH make web-next:test`
- `PATH=/Users/test/.nvm/versions/node/v20.19.1/bin:$PATH make web-next:build`
- `PATH=/Users/test/.nvm/versions/node/v20.19.1/bin:$PATH make web-next:storybook:build`

Frontend build completed with existing budget/CommonJS warnings for Agora-related bundles.

## Follow-ups

- Manual WorkOS smoke test in dev: open `/groups?invite=<code>` while logged out, authenticate/register, confirm return to the invite dialog, accept, and land on the group page.

## Follow-up Fix

- Replaced the URL-driven join dialog's direct conditional `NgpDialog`/`NgpDialogOverlay` usage with a shared `z-action-dialog` component opened through `NgpDialogManager`. `ng-primitives/dialog` expects the trigger/manager path to provide its exit-animation manager; direct conditional rendering caused `NG0201: No provider found for _NgpExitAnimationManager` even though the invitation API request succeeded.
- Refactored the old `z-dialog-panel` confirmation wrapper to delegate to `z-action-dialog`, preserving existing call sites while centralizing the Angular Primitives overlay/panel/actions shell.
