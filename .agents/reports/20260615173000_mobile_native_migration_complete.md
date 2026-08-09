# Mobile Native-Adaptive Migration — Completion Report & Device-Validation Handoff

- **Date:** 2026-06-15
- **Branch:** `feat/mobile-token-auth` (single mobile PR #15) — **all commits local, NOT pushed** (per project git rule)
- **Status:** **Code-complete** (Phases 0–4, each reviewed + fixed). **Pending on-device validation** (iOS entirely; Android full re-pass).
- **Spec:** `.agents/plans/20260614172400_mobile_platform_adaptive_native_design.md` · **Plan:** `.agents/plans/20260614173000_mobile_native_phase0_1_implementation.md`
- **Prior reports:** Phase-0+1 completion `20260614181500_*`, Phase-0 spike `20260615091500_*`.

## What was delivered
Rebuilt the mobile app from a web-parity visual port to a **platform-adaptive native UI** (iOS HIG via SwiftUI, Android Material 3 via Jetpack Compose) using `@expo/ui`, behind unchanged `z-*` public APIs.

- **Phase 0 — Spike (Android device-validated):** proved `@expo/ui` runs on a real device; caught + fixed the device-only `z-toast` self-import crash.
- **Phase 1 — Guardrails + Foundation:** `AGENTS.md` + Claude/Codex agents re-grounded to native-fidelity; ESLint drift-gate (**now at `error`**: no raw `@expo/ui`/`Pressable`/`Modal`/`TouchableOpacity`/`TouchableHighlight`/`lucide` in `src/app`); semantic role tokens (light+dark); `theme/native.ts` token→modifier adapter; shared `Touchable` (+haptics); `ZSymbol` (SF/Material symbols); tier manifest + **hardened** contract test.
- **Phase 2 — Controls + Screens:** every control primitive native (Button, IconButton/FAB, TextField, Textarea, Checkbox→Toggle/Checkbox, Select→Picker/menu, Combobox→pushed `/select` search screen, Tabs→Segmented, Card→Section/Card, Badge, Chip, EmptyState→ContentUnavailableView, QueryError, Dialog/ConfirmDialog→Sheet/Alert, Toast→burnt/Snackbar); all ~17 screens migrated to `ZSymbol`/`Touchable`.
- **Phase 3 — Navigation:** bottom tabs → `NativeTabs`; per-tab native large-title headers; detail/form native-stack headers + swipe-back; FAB split (Android FAB / iOS nav-bar `+`); `ZScreen` insets reworked; upload/book → `formSheet`.
- **Phase 4 — Polish:** login i18n (`auth.login.*`), detail title fallbacks, NotificationBell → native icon, ZSkeleton shimmer, ESLint promotion, dark-token audit, dead-code removal (`ZPageHeader`/`ZBackHeader`), tier reconciliation.

**Verification (every phase stayed green):** `make mobile:lint` 0 errors · `tsc --noEmit` 0 · `make mobile:test` **616 tests** · `check-tokens-synced` in sync. ~36 commits. **Each phase was reviewed by a 3-axis adversarial review (best-practices / feature-completeness / UI-drift) and all must-fix items fixed** — these caught real device-breaking bugs CI could not (e.g. native `className` drop, permission-gating regression, raw `TouchableOpacity`).

## ⚠️ Master device-validation checklist (REQUIRED before merge)
CI is green on the bare `.tsx` fallback; native behavior is **unverified**. Build a custom Dev Client (NOT Expo Go) and verify on **real iOS + Android**:

**Both platforms**
- Cold-launch every native primitive's screen — the `.ios/.android` self-import crash ("Maximum call stack") is invisible to CI, only a device boot catches it.
- `className`/`style` forwarding actually applied natively (FAB positioning, card gap/flex/margins, selected-card highlight) — CI can't catch silent drops.
- ZSkeleton shimmer (reanimated worklet) runs; NotificationBell tint/double-announce; login i18n copy.

**iOS — ENTIRELY UNVALIDATED (dev is Windows-only)**
- All native controls per HIG; NativeTabs + large-title headers + swipe-back + formSheet; nav-bar `+` (not FAB), role-correct; safe-area on notch/Dynamic-Island; dark mode (role tokens adapt, flat-`z-*` Custom-RN surfaces are light-only by design); VoiceOver; haptics; SF Symbols render; **Liquid Glass** (deferred — implement/verify here); `burnt` toast HUD builds + shows (the key iOS unknown — fallback `react-native-toast-message` ready).

**Android — full re-pass** (only the Phase-0 spike was device-checked)
- Material 3 controls; NativeTabs + headers; **FAB clears the opaque NavigationBar + gesture pill** (uses a 56dp+inset offset — verify the constant on target devices); TalkBack (known limit: `@expo/ui` TextField can't set contentDescription — mitigated by adjacent `ZFieldLabel`); dark mode (same flat-token caveat); edge-to-edge insets.

(The per-task reports + each phase review contain the granular device items; the full list is in the final-review artifact for run `whk6pr17g`.)

## Known gaps register (intended / deferred — not bugs)
1. **iOS unvalidated** — needs a Mac / Apple Developer account / EAS-iOS build.
2. **Liquid Glass** deferred to the iOS device pass (gated, purely additive).
3. **Dark mode:** legacy flat `z-*` NativeWind tokens have no dark overrides — only `role-*` adapt → Custom-RN surfaces are light-only (light-first ship). To finish dark: add `@media (prefers-color-scheme:dark)` overrides for the flat tokens in `sync-tokens.mjs`, or migrate remaining Custom-RN surfaces to `role-*` classes.
4. **Android `@expo/ui` TextField TalkBack label** — library limitation (documented).
5. **`NotificationBell`** sets the a11y label on both the `Touchable` and the inner `ZSymbol` — verify/de-dup on device (1-line fix if doubled).
6. **`react-native-toast-message` fallback** stays the contingency if `burnt` fails to build on iOS.

## Follow-ups (post-validation polish)
- After device sign-off, capture iOS+Android screenshots for the PR (AGENTS.md rule), then it's ready to push/merge.
- Consider deleting `z-page-header`/`z-back-header` references from `_layout.tsx` doc comments (files already deleted).
- NativeTabs is an `unstable-native-tabs` expo-router API — track upstream stability.

## How to resume
- Android dev build: `npx expo run:android` or `eas build -p android --profile development`; then `npx expo start --dev-client` (emulator connects via `10.0.2.2`).
- iOS: `eas build -p ios --profile development` (needs Apple account + device) or a Mac.
- Everything is on `feat/mobile-token-auth`, uncommitted-nothing, ready to review/push when you're back.
