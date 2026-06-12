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
pnpm run start        # Expo dev server (Expo Go works — no native modules yet)
pnpm run test
pnpm run lint
pnpm exec tsc --noEmit
```

From the repo root: `make mobile:start`, `make mobile:lint`, `make mobile:test`, `make mobile:typecheck`.

## Authentication

Sign-in uses WorkOS AuthKit via PKCE in the system browser (`expo-auth-session`).
Copy `.env.example` to `.env` and set `EXPO_PUBLIC_WORKOS_CLIENT_ID`. The
redirect URI `zeta://auth/callback` must be registered in the WorkOS dashboard.
Tokens live in `expo-secure-store`; the API client refreshes them on 401
automatically. Sign-out is local (token deletion) — server-side session
revocation is a follow-up.

## Regenerating

- API types: `pnpm run generate:api` (after `../docs/openapi.yaml` changes)
- Translations: `pnpm run sync:i18n` (after dashboard i18n JSONs change)
