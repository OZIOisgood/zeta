# Group Invite Link Join Flow Plan

## Context

- Invite links are generated as `/groups?invite=<code>` in `web/dashboard-next/src/app/pages/group-details/group-invitation-dialog.component.ts`.
- Backend support already exists and is protected by auth:
  - `GET /groups/invitations/{code}` returns invitation/group info plus `already_member`.
  - `POST /groups/invitations/accept` adds the current user and returns `group_id`.
- The new Angular groups page currently ignores the `invite` query param.
- `web/dashboard-next/src/main.ts` no longer contains the README-described deep-link preservation, so unauthenticated invite links are redirected through login and return to the dashboard root.
- `internal/auth/handler.go` starts WorkOS login without `state`, and the callback always redirects to `FRONTEND_URL`.

## External Research

- WorkOS AuthKit authorization URLs support an optional `state` parameter and return it to the callback so the app can restore originating URL/query state.
- WorkOS redirect URIs must match configured dashboard redirect URIs; dynamic destinations should not be encoded in `redirect_uri`.
- WorkOS treats `state` as application-owned redirect state. It should be random, unguessable, and validated by the app at callback.

Sources:
- https://workos.com/docs/reference/authkit/authentication/get-authorization-url
- https://workos.com/docs/sso/redirect-uris
- https://workos.com/blog/state-nonce-pkce

## Decision

Implement the actual invite acceptance in the Angular groups page, and replace fragile client `localStorage` return preservation with a backend-owned WorkOS state flow:

- Frontend calls `/auth/login?return_to=<current relative url>` when auth guard bounces an unauthenticated user.
- Backend validates `return_to` as same-app relative path only.
- Backend creates a random state ID, stores `{state, return_to, expires_at}` in an HttpOnly short-lived cookie, and sends only the random state value to WorkOS.
- Callback verifies returned `state` against the cookie, clears the cookie, then redirects to `FRONTEND_URL + return_to`.
- If there is no `return_to`, default to the existing `FRONTEND_URL` behavior.

This avoids putting invite codes into WorkOS `redirect_uri`, avoids exposing return data in WorkOS `state`, and removes the registration-abort/localStorage edge case.

## Implementation Plan

1. Backend auth return-state
   - Add a short-lived auth state cookie in `internal/auth/handler.go`.
   - Parse `return_to` in `Login`, allowing only relative paths beginning with `/` and rejecting scheme/host/backslash variants.
   - Generate crypto-random state, store state plus return path and expiration in the HttpOnly cookie.
   - Pass `State` into `usermanagement.GetAuthorizationURLOpts`.
   - In `Callback`, verify query `state` against the cookie when state is present/expected, clear the cookie, and redirect to the validated return path.
   - Add/adjust Go tests around login URL options, callback redirects, mismatch/expired state, and invalid return paths.

2. Frontend auth API/guard
   - Change `AuthApiClient.getLoginUrl(returnTo?: string)` to append `return_to`.
   - Change `SessionStore.login(returnTo?: string)` and `authGuard` to pass `Router.url`.
   - Keep existing behavior for explicit login calls without a return path.
   - Add focused tests for URL encoding and guard bounce behavior if existing test setup allows it cleanly.

3. Frontend invitation API
   - Extend `GroupsApiClient` with:
     - `getInvitationInfo(code)`
     - `acceptInvitation(code)`
   - Add typed responses matching backend JSON: `code`, `group_id`, `group_name`, `group_avatar`, `already_member`.

4. Groups page join flow
   - In `GroupsPageComponent`, read `invite` from `ActivatedRoute.queryParamMap`.
   - When present, load invitation info once the page is active.
   - Show a confirmation dialog using existing dialog/ng-primitives patterns and existing avatar/button primitives.
   - States:
     - loading: skeleton/disabled dialog controls, no visible loading text.
     - already member: toast, remove `invite`, navigate to `/groups/:groupId`.
     - invalid/used/not found: error toast, remove `invite`, stay on groups list.
     - accept success: call accept endpoint, reload groups, toast, remove `invite`, navigate to `/groups/:groupId`.
     - decline/close: remove `invite`, stay on groups list.

5. I18n/copy
   - Reuse existing `groups.invitationDialog.*` keys where possible.
   - Add missing `joining`, `joined`, `joinFailed`, `notFound`, and `alreadyMember` keys in `public/i18n/en.json`, `de.json`, and `fr.json`.
   - Keep UI copy saying "group" and "join"; do not rename backend `asset`/table/API terms.

6. Verification
   - Frontend: `make web-next:lint`, `make web-next:test`, `make web-next:build`.
   - Backend auth tests or, if backend auth handler changes are small and tests are limited, run focused `go test ./internal/auth ./internal/invitations -count=1`, then `make api:build`.
   - Manual flow:
     - authenticated user opens `/groups?invite=<code>` and joins.
     - authenticated existing member opens same link and lands on group.
     - unauthenticated user opens invite link, logs in/registers through WorkOS, returns to `/groups?invite=<code>`, then sees join flow.
     - invalid code shows a toast and clears query param.

## Risks / Follow-ups

- Need to verify `groups:read` exists for the default student role; otherwise the route guard can block invite acceptance after auth.
- The auth state cookie depends on API callback and login being on the same API origin, which matches the current `/auth/login` and `/auth/callback` setup.
- If product wants invite preview before auth, backend would need a public metadata endpoint with careful information exposure limits; this plan keeps the current protected backend model.
