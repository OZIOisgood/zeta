# Mobile Storybook Coverage — Completion Report

**Date:** 2026-06-14
**Plan:** `.agents/plans/20260614110801_mobile_storybook_coverage.md`
**Branch:** `feat/mobile-token-auth` (part of the single mobile PR #15)

## Context

Stood up a browser-based Storybook for the Expo app (`mobile/`) using `@storybook/react-native-web-vite@10.4`, mirroring the Angular dashboard's Storybook DX. Local-only — no CI/Chromatic gate yet (deferrable). Full catalog: 29 `z-*` primitives + 13 composites + a page-state catalog = **43 stories**.

## What shipped

- **Storybook infra** (`mobile/.storybook/`): `main.ts` (framework + NativeWind JSX + inline PostCSS/Tailwind + native-module aliases), `preview.tsx`, global `decorators.tsx` (SafeAreaProvider + GestureHandlerRootView + token bg), `i18n-storybook.ts`, `tsconfig.json`, `mocks/` (expo-video, expo-camera, react-native-agora). `.npmrc` (Babel hoist for pnpm), scripts `storybook`/`build-storybook`, `storybook-static/` gitignored.
- **Shared fixtures** `mobile/src/components/__stories__/fixtures.ts` (typed against the real `api/queries` entities).
- **43 stories** co-located, titled `UI/*` / `Components/*` / `Pages/*` (web-parity taxonomy). Each: a `Playground` (argTypes controls) + a `Matrix`/`States` covering every prop-union value + standard states (disabled/loading/error/empty/long-text/optional). Page catalog renders loading/error/empty/data for Groups, Sessions, Videos.

## Spike found two real pipeline bugs (build-green hid both)

The spike's "DONE" hid a **blank canvas** — caught only by an independent browser render check, not by the green build:

1. **`babel-preset-expo` must NOT be injected into the Vite babel pass.** It is Metro-only and runs `@babel/plugin-transform-modules-commonjs`, rewriting our ESM to CJS; Vite double-interops it → `_interopRequireDefault is not a function` (minified `YR is not a function`) at runtime. Fix: pass only `jsxImportSource: 'nativewind'`.
2. **`lucide-react-native@1.17.0` ships a malformed ESM build** (barrel re-exports `LucideProvider`, absent from `context.mjs`) → Vite dev-optimizer hard-fails. Fix: alias to its CJS build (the `require` condition Metro uses) + `optimizeDeps.include`.

(Both in `mobile/.storybook/main.ts`, commented. Recorded in memory `zeta-mobile-storybook-setup`.)

## Authoring (drift-guarded parallel workflow)

39 stories authored by a parallel workflow (`mobile-storybook-stories`): per component **author → adversarial drift-check (against the real prop-unions) → auto-fix**. All 39 passed drift-check on the first pass (0 invented props / missing variants / wrong titles).

## Verification (controller, independent of the workflow self-report)

- `pnpm run build-storybook` → **green** (all 85 story entries compile).
- `pnpm exec tsc --noEmit` → **0** — *after* fixing 4 type errors the build (type-strip) had masked: `asset-card`/`review-composer` passed `null` where `string | undefined` was expected; `z-keyboard-avoiding-view` needed a `children` default in `meta.args` (required-prop gotcha).
- `pnpm run lint` → **0 errors** (4 pre-existing warnings) — *after* fixing 3 `react-hooks/rules-of-hooks` errors (`z-tabs`/`z-toast` called hooks inside `render`; extracted into named components) and dropping an unused `TONES` const.
- **Browser Gate B** (python-serve `storybook-static` + Playwright on WSL localhost): spot-checked page catalog, `review-composer`, `asset-card`, `z-video-preview`, `z-button`, `z-icon-button` — all render with NativeWind tokens, real i18n text (not keys), SVG icons, working mock seams; **0 console errors**.

## Follow-ups (deferred per design — YAGNI)

- On-device `@storybook/react-native` for true-native verification of camera/Agora/video.
- Chromatic + CI parity gate against the web Storybook titles.
- Vitest stories-as-tests in a real browser.
- `brand-candidates`-equivalent catalog.
- Minor: `z-icon-button` Matrix uses a light icon color on secondary/ghost rows (icons faint on light bg) — cosmetic story polish.
