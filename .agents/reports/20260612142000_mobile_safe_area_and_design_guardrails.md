# Mobile Safe-Area Fix + Design Guardrails

## Context

Layout analysis of the mobile app (PR #15, `feat/mobile-token-auth`) found screens rendering under the status bar/camera cutout (no safe-area handling anywhere; Android is edge-to-edge since SDK 54 and all navigators set `headerShown: false`), no design rules in `mobile/AGENTS.md`, two hand-maintained mirrors of the dashboard color tokens, and raw `TextInput`s in the upload screen. Plan: `.agents/plans/20260612140000_mobile_safe_area_and_design_guardrails.md`.

## Decisions

- **ZScreen wrapper (fix):** `src/components/ui/z-screen.tsx` applies `useSafeAreaInsets` as padding (flex-1, `bg-z-bg`, configurable `edges`, horizontal insets always). No root provider was added — expo-router's `ExpoRoot` already mounts a `SafeAreaProvider`. All eight screens wrap in it: tab screens use `edges={['top']}` (the tab bar owns the bottom inset); `asset/[id]` keeps the video player edge-to-edge (`edges={['bottom']}` on the success branch, full insets on skeleton/error branches); `upload`, `login`, `auth/callback` use defaults. `jest.setup.js` registers the library's built-in jest mock so screen tests render without a provider; `z-screen.test.tsx` asserts inset padding via a real `SafeAreaProvider` with `initialMetrics`.
- **Design guardrails:** `mobile/AGENTS.md` (existing "Expo HAS CHANGED" note kept) now mandates ZScreen on every screen, `web/dashboard-next` as design reference, `z-*`-only primitives mirroring the web wrappers (no raw `TextInput`/`Pressable` in screens), token-only colors, skeleton loading states, synced i18n keys only, emulator screenshots in PR descriptions, and no tests under `src/app/`. Root `AGENTS.md` review guidelines gained the screenshot requirement.
- **Token sync:** `scripts/sync-tokens.mjs` (`pnpm run sync:tokens`) extracts the 14 `--z-*` vars from `web/dashboard-next/src/styles.scss` and regenerates a marker-delimited block in `global.css` plus the whole `src/theme/colors.ts` (with a `MOBILE_EXTRAS` map for mobile-only tokens like `onPrimary`). `src/theme/tokens-sync.test.ts` fails on any drift between the scss source and either mirror (verified red on a perturbed token). `@types/node` added (dev) and `"node"` to tsconfig `types` for the fs-based test.

## Files Touched

`mobile/src/components/ui/z-screen.tsx` (+test), all files in `mobile/src/app/`, `mobile/jest.setup.js`, `mobile/package.json`, `mobile/tsconfig.json`, `mobile/pnpm-lock.yaml`, `mobile/global.css`, `mobile/src/theme/colors.ts` (now generated), `mobile/scripts/sync-tokens.mjs`, `mobile/src/theme/tokens-sync.test.ts`, `mobile/AGENTS.md`, `AGENTS.md`.

## Verification

- `make mobile:lint && make mobile:typecheck && make mobile:test` green: 65 tests / 19 suites (2 new ZScreen tests, 3 new drift tests; 1 pre-existing i18next lint warning, 0 errors).
- `expo export --platform web`: 14 static routes, no test routes.
- Emulator screenshot of the Videos tab (Metro Fast Refresh, emulator-5554): content now starts below the status bar instead of rendering under it.

## Follow-ups

- Upload screen still uses raw `TextInput`s — build `z-text-input`/`z-textarea` counterparts per the new guardrails when the screen is next touched.
- Only 2 of ~22 web `z-*` primitives exist on mobile; grow the set on demand, mirroring the web inventory.
