# Zeta Mobile

Expo / React Native app for the Zeta platform.

## Stack

- Expo (expo-router, file-based routes under `src/app/`)
- NativeWind (Tailwind) with the Zeta design tokens from `global.css` — kept in
  sync with `web/dashboard-next/src/styles.scss`
- Typed API client generated from `../docs/openapi.yaml` (`pnpm run generate:api`)
- i18next with translations synced from the dashboard (`pnpm run sync:i18n`)
- TanStack Query for server state (query hooks in `src/api/queries/`)
- `expo-video` for Mux HLS playback
- Jest (`jest-expo`) + React Native Testing Library

## Development

```bash
pnpm install
pnpm run start        # Expo dev server
pnpm run test
pnpm run lint
pnpm exec tsc --noEmit
```

From the repo root: `make mobile:start`, `make mobile:lint`, `make mobile:test`, `make mobile:typecheck`.

## Development builds

Most features work in **Expo Go**. The exception is **live video calls**: `react-native-agora`
is a native module that Expo Go cannot load. A custom development client (APK) is required for
any screen that uses the Agora RTC engine — i.e. `/call/[bookingId]`.

### Build

```bash
npx eas-cli@latest build --profile development --platform android
```

EAS Build uploads the project to Expo's build service and returns a link when the build
finishes (10–25 min on the free tier). Find the APK on
[expo.dev → Projects → zeta → Builds](https://expo.dev/accounts/henry2k/projects/zeta/builds)
or at the URL printed by `eas build`.

### Install and run

1. Download the `.apk` from the build page.
2. Install on a connected device or running emulator:
   ```bash
   adb install build.apk
   ```
3. Start the Metro bundler:
   ```bash
   pnpm run start
   ```
   With `expo-dev-client` installed the custom client connects to the running Metro server
   automatically, giving you fast refresh just like Expo Go — but with full native-module support.

## Authentication

Sign-in uses WorkOS AuthKit via PKCE in the system browser (`expo-auth-session`).
Copy `.env.example` to `.env` and set `EXPO_PUBLIC_WORKOS_CLIENT_ID`. The
redirect URI `zeta://auth/callback` must be registered in the WorkOS dashboard.
Tokens live in `expo-secure-store`; the API client refreshes them on 401
automatically. Sign-out is local (token deletion) — server-side session
revocation is a follow-up.

## Uploads

Uploads go directly to Mux: `POST /assets` returns one direct-upload URL per
file, the app PUTs each file sequentially (`src/upload/`), then calls
`POST /assets/{id}/complete`. The queue lives in a persisted Zustand store —
interrupted uploads survive restarts as retryable entries (a retry re-uploads
the whole file; chunked resume is a follow-up).

## Reviews

The asset detail screen lists the active part's reviews (threaded, one level)
and lets users with `reviews:create` comment — optionally anchored to the
current player position. Timestamp chips seek the player. Edit/delete and the
LLM enhancer remain web-only for now.

## Groups & Invites

The Groups tab lists the user's groups; the detail screen shows members
(sections are permission-gated: students list needs `groups:user-list:read`,
experts list needs `groups:expert-list:read`) and offers leaving via
`groups:membership:leave` (owners cannot leave). Joining works by scanning an
invite QR code (`expo-camera`, works in Expo Go) or entering the 6-character
code; the confirmation step shows the group before accepting.

## Coaching

The Coaching tab lists your sessions (upcoming and past; recordings link to
the review screen). Users with `coaching:book` book through a guided flow:
group → expert → session type → free slot → confirm. Users with
`coaching:video:connect` see a **Join** button during the connect window;
tapping it opens the live Agora video call. Live calls require the development
build APK (see [Development builds](#development-builds)) — Expo Go cannot
load the `react-native-agora` native module.

## Regenerating

- API types: `pnpm run generate:api` (after `../docs/openapi.yaml` changes)
- Translations: `pnpm run sync:i18n` (after dashboard i18n JSONs change)
