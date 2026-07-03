# Mobile Native-Adaptive — Phase 0 Spike Report (device findings)

- **Date:** 2026-06-15
- **Branch:** `feat/mobile-token-auth` (single PR #15)
- **Plan:** `.agents/plans/20260614173000_mobile_native_phase0_1_implementation.md` (Task 0.7)
- **Validated on:** Android emulator (dev client). **iOS: NOT validated** (developer is on Windows — no Mac / Apple account / EAS-iOS build yet).

## Headline result
**The `@expo/ui` native pipeline runs end-to-end on a real Android dev build.** Confirmed on the Preferences screen: the native Compose `Button` shows a **Material ripple** on press, and `showToast` shows a **Material 3 Snackbar from the bottom** — i.e. the `.android.tsx` native variants render, not the NativeWind fallback. The Phase-0 de-risk goal (prove the approach works on-device) is **met for Android**.

## The device-only bug we caught (the main reason spikes exist)
**Platform-file self-import → startup crash.** A `z-*.android.tsx`/`.ios.tsx` that re-exports shared code via `export ... from './z-<base>'` self-resolves to itself on device (Metro: `.android`/`.ios` win over `.tsx`) → infinite re-export → **"Maximum call stack size exceeded"** at startup. It **passes jest / Storybook / web** (there `./z-<base>` → the bare `.tsx`), so **only a real dev build catches it.** It bit `z-toast` (the one primitive that left its store in the bare `.tsx`).
- **Fix (committed `40d81f1`):** shared runtime → `z-toast.shared.tsx`; all three entry files import from `./z-toast.shared`. Tree green (tsc/lint/jest).
- **Convention (must add to `mobile/AGENTS.md` before Phase 2):** a platform file NEVER imports its own base name; shared runtime goes in `z-<base>.shared.tsx`, types in `z-<base>.types.ts`. This is a Phase-2 prerequisite (the other spiked primitives avoided it by importing only `.types`, so they booted fine).

## Validated (Android)
- `ZButton` (Compose Button, ripple), `ZSymbol` (Material Symbols), `Touchable` (ripple), `showToast` → Snackbar. Metro platform resolution serves `.android.tsx`. `@expo/ui` native module is in the dev-client binary (no missing-module crash). Connect the emulator to Metro via **`10.0.2.2`** (not localhost).

## STILL OPEN — iOS (entirely unvalidated)
None of the iOS-specific behavior has run on a device. Outstanding until iOS access exists (Mac / Apple Developer account / EAS-iOS build):
- **`burnt` (iOS toast HUD)** — installed, types resolve under tsc, but its native SPM module has **never been built/run**. THE key iOS unknown. Fallback ready: `react-native-toast-message`.
- SF Symbols rendering (`ZSymbol` iOS), iOS `Picker` menu + label-as-placeholder, SwiftUI `Alert` (no native button-disable → relies on caller `isPending`), iOS BottomSheet keyboard + detent sizing, `Host matchContents` width on iOS, Liquid Glass (`expo-glass-effect`).

## Known limitations surfaced
- **Android Snackbar tone color:** `SnackbarHost.showSnackbar` has no per-invocation color → all tones render the `info` chrome. Cosmetic; revisit if needed.
- **Profile was a weak showcase:** its dominant controls (`ZCombobox` language/timezone, `ZTextInput`, `ZCheckbox`, `ZCard`, `ZTabs`) are intentionally NOT migrated, so the screen looks ~unchanged. Phase 2 should validate on control-heavy screens and migrate the dominant controls for a visible difference.

## Follow-ups feeding Phase 2 planning
1. Add the self-import convention to `mobile/AGENTS.md` (+ optionally a lint/test guard) — **before** more platform-split work.
2. Resolve the **iOS validation path** (Mac / Apple account / EAS-iOS) — otherwise Phase-2 iOS work proceeds unverified.
3. Consider a global jest config preferring bare `.tsx` (instead of per-primitive `moduleNameMapper`).
4. burnt verdict stays **PENDING iOS**; keep `react-native-toast-message` as the contingency.
5. Minor cleanups carried from foundation: `Touchable` ripple from `outline` token; exempt `src/__tests__/**` from no-hex; `firedIds` set is unbounded in the toast hosts.
