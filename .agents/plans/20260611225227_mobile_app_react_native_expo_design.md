# Mobile App Design: iOS + Android with React Native + Expo

- **Date:** 2026-06-11
- **Status:** Design approved in brainstorming session; implementation plan pending
- **Author:** Heinrich + Claude (brainstorming session)

## Context

Zeta currently ships a web-only Angular dashboard. We want a native mobile app for iOS and Android covering the full platform feature set. Technology choice (user decision): React Native + Expo.

Codebase analysis identified five friction points with the current stack: cookie-based WorkOS auth, Agora requiring a native module, mobile video upload robustness, SSE notifications, and the absence of a shared API contract. None are blockers; auth is the largest backend change.

## Decisions

| Topic | Decision |
| --- | --- |
| Scope | Full feature parity with the web dashboard (student and expert features) |
| Rollout | Big bang: public store release only at parity; continuous internal builds via TestFlight / Play Internal Testing during development |
| API contract | Introduce a hand-maintained OpenAPI 3.1 spec in the backend; generate the mobile TypeScript client from it |
| App stack | expo-router + TanStack Query + Zustand + NativeWind v4 (Expo SDK 55+, New Architecture) |

## System Architecture

```
+---------------------+         Bearer JWT (OpenAPI client)        +----------+
|     Mobile App      | -----------------------------------------> |  Go API  |--> PostgreSQL
| Expo / React Native |                                            +----+-----+
|                     | --> WorkOS AuthKit  (PKCE login, browser)       |
|                     | --> Mux             (direct upload + HLS)       | push send
|                     | --> Agora           (react-native-agora)        v
|                     | <-- APNs / FCM <-- Expo Push Service <----------+
+---------------------+

Angular dashboard: unchanged (cookies + SSE against the same API)
```

The app consumes the same API endpoints as the web dashboard. Only two things differ: the auth transport (Bearer token instead of HttpOnly cookie) and the notification channel (push instead of SSE). Existing web flows remain untouched.

## App Architecture

```
mobile/src/
  app/            expo-router routes (tabs: Videos, Coaching, Groups, Profile)
  features/       screens + feature hooks (upload, review, booking, call, invites)
  api/            generated openapi-fetch client + TanStack Query hooks
  components/ui/  z-* equivalents as RN components (NativeWind, Zeta design tokens)
  lib/            auth session (SecureStore + refresh), upload queue,
                  push registration, i18n (i18next, shared Transloco JSONs)
```

- **Server state:** TanStack Query (caching, retries, invalidation). **Client state:** Zustand (session, upload queue, call UI).
- **Styling:** NativeWind v4; port Zeta design tokens from `web/dashboard-next/src/styles.scss`; icons via `lucide-react-native`.
- **i18n:** i18next reusing the existing Transloco translation JSONs (en/de/fr) as the shared source.
- **Video playback:** `expo-video` (Mux HLS); timestamped review comments driven by player position.
- **Video capture/upload:** `expo-camera` / `expo-image-picker`; uploads via `expo-file-system` upload tasks against Mux direct-upload URLs, resumable chunks, with a persisted upload queue that survives app switches and network loss (per Mux's official RN guidance).
- **Live coaching:** `react-native-agora` (v4) against the existing `/connect` endpoint; includes the expert side (availability, session types).
- **Error handling:** 401 → client interceptor refreshes the token once, then logs out; upload queue retries with backoff; offline banner via NetInfo.

## Backend Changes

1. **Auth (largest item):** App opens AuthKit via `expo-auth-session` (authorization code + PKCE through the system browser, per RFC 8252). WorkOS redirects to `zeta://auth/callback`; the app posts the code to a new `POST /auth/token` endpoint, which exchanges it at WorkOS (like today's `/auth/callback`) and returns access + refresh tokens **as JSON** instead of setting cookies. Add `POST /auth/token/refresh`. Auth middleware additionally accepts `Authorization: Bearer ...`; JWKS validation and the permission model stay unchanged. Tokens are stored in `expo-secure-store`.
2. **Push notifications:** New `user_devices` table (Expo push token per device), register/unregister endpoints, delivery through the Expo Push HTTP API from the Go backend — hooked into the existing notification paths alongside email and SSE, respecting `user_preferences`. SSE stays web-only.
3. **OpenAPI:** Hand-maintained spec (`api/openapi.yaml`) with CI validation; client generation via `openapi-typescript` / `openapi-fetch`.
4. **Deep links:** Universal Links / App Links for invite URLs (`/groups?invite=CODE`) via AASA + assetlinks.json served from the frontend domain. The app scans invite QR codes with the camera.

## Project Structure & Tooling

- App lives as `mobile/` in the Zeta repo (pnpm workspace; Expo supports this, expect some initial hoisting configuration).
- New Makefile targets: `mobile:start`, `mobile:lint`, `mobile:test`, `api:openapi:lint`.
- **Expo Go is not usable** (Agora is a native module) — use `expo-dev-client` + EAS Build from day one.
- README architecture diagrams must be updated when the mobile app and new endpoints land (per repo rules).

## Release & Compliance

- Continuous internal distribution during development (TestFlight / Play Internal Testing); public release at parity.
- After release: EAS Update for OTA fixes to the JS bundle.
- **Apple requirements to clarify before submission:**
  - Account deletion inside the app is mandatory when accounts can be created → likely needs a new API endpoint including WorkOS user deletion.
  - If Google login is enabled in AuthKit, Apple requires Sign in with Apple as an alternative.

## Testing

- Jest + React Native Testing Library for components/hooks.
- Maestro for E2E smoke flows (login, upload, booking).
- Backend changes follow existing Go test conventions (`make test:unit`, `make test:integration`).

## Risks

- Big-bang scope: realistically several months solo; parity includes the expert review UX on small screens.
- Agora and push are only fully testable on physical devices.
- iOS background upload limits for large training videos.
- App Store review cycles are an unknown at the very end of the timeline.

## Follow-ups

- Write the implementation plan (`.agents/plans/`), decomposing into ordered work packages (suggested order: OpenAPI spec + token auth → app skeleton + design system → videos/upload → reviews → groups/invites → coaching/calls → push → compliance/release).
- Verify WorkOS PKCE specifics against the current docs at implementation time ([WorkOS Expo example](https://github.com/workos/expo-authkit-example), [WorkOS RN/Expo docs](https://workos.com/docs/integrations/react-native-expo)).
- Decide whether Google login stays enabled (drives the Sign in with Apple requirement).
- Design the account-deletion endpoint (Apple requirement) with WorkOS user deletion semantics.

## References

- [Expo SDK 56 beta / New Architecture status](https://expo.dev/changelog/sdk-56-beta)
- [Agora SDK on Expo (dev client)](https://www.agora.io/en/blog/building-a-video-calling-app-using-the-agora-sdk-on-expo-react-native/)
- [Mux: upload videos from React Native](https://www.mux.com/docs/frameworks/react-native-uploading-videos)
- [RFC 8252: OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
