# Mobile Safe-Area Fix + Design Guardrails

## Context

Layout analysis of the mobile app (PR #15, branch `feat/mobile-token-auth`) found: no safe-area handling anywhere (screens render under the status bar; Android is edge-to-edge since SDK 54), no design rules in `mobile/AGENTS.md`, two hand-maintained mirrors of the dashboard color tokens, and only 2 `z-*` primitives vs ~22 on the web. This plan stops the drift.

## Tasks

**A — Safe-area fix (bug).** New `mobile/src/components/ui/z-screen.tsx`: `ZScreen` wrapper using `useSafeAreaInsets` (flex-1, bg-z-bg, configurable `edges` defaulting to `['top','bottom']`, left/right always applied). No root `SafeAreaProvider` needed — expo-router's `ExpoRoot` already provides one (verified in `node_modules/expo-router/build/ExpoRoot.js`). Apply to all screens: tab screens use `edges={['top']}` (the tab bar owns the bottom inset); `asset/[id]` keeps the video player edge-to-edge (`edges={['bottom']}` on the success branch, full insets on skeleton/error branches); `upload`, `login`, `auth/callback` use defaults. New `jest.setup.js` registering the library's built-in jest mock (zero insets, mocked provider honors `initialMetrics`) so existing screen tests keep passing; `z-screen.test.tsx` (RNTL, async render) asserts inset padding via real `SafeAreaProvider` + `initialMetrics`.

**B — Design rules in `mobile/AGENTS.md`** (keep the existing "Expo HAS CHANGED" note): ZScreen on every screen; `web/dashboard-next` is the design reference; new UI only from `z-*` primitives built as counterparts of the web wrappers (inventory in `web/dashboard-next/CLAUDE.md`), no raw `TextInput`/`Pressable` in screens; colors only via NativeWind `z-*` classes / `theme/colors.ts`, no raw hex; skeletons, never loading text; i18n keys must exist in en+de+fr of the synced JSONs; emulator screenshot in the PR description for UI changes.

**C — Token sync script.** `mobile/scripts/sync-tokens.mjs` (modeled on `sync-i18n.mjs`): parse the 14 `--z-*` vars from the `:root` block of `web/dashboard-next/src/styles.scss`; regenerate (1) a marker-delimited block in `mobile/global.css` and (2) the whole `mobile/src/theme/colors.ts` (camelCase names + a `MOBILE_EXTRAS` map for mobile-only tokens like `onPrimary`); both clearly marked as generated. `package.json` script `sync:tokens`. Drift test `mobile/src/theme/tokens-sync.test.ts` parses the scss source and compares it against `global.css` and the exported `colors` object.

**D — Root `AGENTS.md`.** Review Guidelines: add a line requiring an emulator screenshot of the affected screens in the PR description for mobile UI changes.

## Verification

- `make mobile:lint && make mobile:typecheck && make mobile:test` (via wsl, `bash -ic`)
- `cd mobile && pnpm exec expo export --platform web` — route list must show no test routes
- Emulator screenshot of the Videos tab if an emulator is running

## Commits

One commit per task on `feat/mobile-token-auth` (conventional commits, no co-author trailer), push at the end; completion report to `.agents/reports/`.
