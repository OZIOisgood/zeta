# Mobile z-* Primitive Cleanup

## Context

The design guardrails added in `.agents/reports/20260612142000_mobile_safe_area_and_design_guardrails.md` forbid raw `TextInput`/`Pressable` in screens, but three screens still violated them (upload form inputs, back buttons, group/part chips, the upload FAB). This change clears all violations on `feat/mobile-token-auth` (PR #15).

## Decisions

- **New primitives** in `src/components/ui/`, mirroring the web wrappers' naming/variants (`web/dashboard-next/CLAUDE.md`): `ZTextInput`, `ZTextarea` (rows/invalid/disabled), `ZIconButton` (variant `primary|secondary|ghost`, size `sm|md|lg`, shape `rounded|circle` — `lg`/`circle` are mobile-only additions for the FAB), and `ZChip` (selectable pill, no web counterpart yet; exposes `selected` accessibility state).
- **Screens cleaned:** `upload.tsx` (inputs → ZTextInput/ZTextarea, back/remove buttons → ZIconButton, group chips → ZChip), `asset/[id].tsx` (back → ZIconButton, part chips → ZChip), `(tabs)/index.tsx` (FAB → ZIconButton primary/lg/circle). `grep Pressable|TextInput src/app/` is clean.
- **NativeWind cascade lesson:** utility overrides via appended `className` are unreliable for same-property conflicts (`rounded-full` lost to the base `rounded-md`; `border-transparent` rendered a default-colored border). Visual identity therefore lives in explicit props (`shape`, variant border classes); `className` is for layout/positioning only.

## Files Touched

`mobile/src/components/ui/z-text-input.tsx`, `z-textarea.tsx`, `z-icon-button.tsx`, `z-chip.tsx` (each +test), `mobile/src/app/upload.tsx`, `mobile/src/app/asset/[id].tsx`, `mobile/src/app/(tabs)/index.tsx`.

## Verification

- `make mobile:lint && make mobile:typecheck && make mobile:test` green: 72 tests / 23 suites (7 new primitive tests; the existing upload-screen flow test still passes unchanged).
- Emulator (emulator-5554, Expo Go + Metro): Videos tab shows the circular primary FAB; upload screen renders ZTextInput/ZTextarea/ZChip and a borderless ghost back button, all inside the safe area.

## Follow-ups

- Remaining web primitives (`z-field-label`, `z-badge`, …) get built on demand per the guardrails.
- Hardcoded English strings in screens (separate, pre-existing i18n follow-up).
