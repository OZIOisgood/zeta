# Production session expiry investigation

## Context

The production dashboard intermittently returned `401 Unauthorized` from profile updates, reports, notifications, and coaching endpoints. Reloading the page restored access.

## Finding

This is an access-token refresh gap, not a WorkOS preference or timezone problem. Production logs show authenticated requests succeeding, then all protected endpoints returning 401 about five minutes after the last token issuance. Reloading invokes the auth guard, performs a transparent AuthKit SSO round-trip, and immediately restores 200 responses.

The backend stores the WorkOS access JWT in a cookie with a 24-hour browser expiry, but the JWT itself has a much shorter configured lifetime. Once its `exp` passes, middleware correctly rejects it. The refresh cookie exists, but the web client has no refresh-on-401 path. The raw notification `EventSource` also bypasses Angular HTTP interceptors.

WorkOS documents that expired access tokens must be renewed with the refresh token and that rotated refresh tokens must replace the previous value: <https://workos.com/docs/authkit/sessions>.

## Evidence

- `PUT /auth/me` returned 200 at 18:40:03 UTC and 401 at 18:45:28.
- `GET /reports/events` returned 401 at 18:48:42.
- Reload triggered AuthKit and both `/auth/me` and `/reports/events` returned 200 at 18:49:14.
- The failed request is rejected by authentication middleware before profile preference handling runs.

## Recommended follow-up

- Add a cookie-based web refresh endpoint using the existing organization-scoped refresh helper.
- Add single-flight Angular refresh-and-retry handling for API 401 responses.
- Reconnect notification SSE after a successful refresh.
- Make profile-update token rotation use the same organization-scoped helper and persistent cookie settings.
- Test concurrent 401s, rotated refresh tokens, terminal versus transient refresh failures, recursion prevention, and SSE recovery.

No authorization code was changed during this investigation.
