# Mobile UI-Kit Handoff Adoption — Completion Report

**Date:** 2026-06-17
**Branch:** `feat/mobile-token-auth`
**Plan:** [.agents/plans/20260617120000_mobile_ui_kit_handoff_adoption_plan.md](../plans/20260617120000_mobile_ui_kit_handoff_adoption_plan.md)
**Range:** `aa4922b..HEAD` (HEAD `0a54dcf` at report time)

## Context
Adopted the whole-library Material-You UI-kit handoff (`mobile/handoffs/handoff_ui_kit/`) into the `z-*` primitive library and the screens that compose it. Executed subagent-driven (fresh implementer per task + two-stage spec/quality review), grounded by a read-only multi-agent audit of the actual code. Governing rule: the handoff wins in case of doubt.

## What landed (22 plan tasks, ~24 commits)
- **Phase 0 — Token foundation:** new `secondaryContainer`/`onSecondaryContainer` role pair (light+dark) via the generator `scripts/sync-tokens.mjs` → regenerated `roles.ts`/`colors.ts`/`global.css`, wired `tailwind.config.js`, extended the `theme-roles` REQUIRED gate. This is the unified "selected/tonal-on" color language.
- **Phase 1 — primitives adapted (9):** ZButton (`tonal` variant + pill fallback; iOS `bordered`+secondaryContainer tint), ZCard (tonal `surface` default + `tone`/`hero` + legacy `outlined`/`elevated`), ZChip (secondary-container selected + leading check + 700/12dp), SegmentedButton/`z-tabs.android` (secondary-container active), ZTextInput/ZTextarea (M3 outlined 56dp + iOS filled), ZFab (`tone`; M3 shape via Compose default — `@expo/ui` exposes no shape/elevation prop), ZToast (dark M3 inverse-pill snackbar / **iOS `burnt` HUD → custom RN top banner**), Android nav pill (secondary-container indicator + content).
- **Phase 2 — new primitives (3):** ZDivider (split), ZSwitch (single-file, RN core `Switch` = native control; tier `custom-no-native`), ZListItem (composition; bare=Material/Android contract + `.ios` grouped-cell; supports `leading/title/subtitle/titleAccessory/trailing/onPress?/selected/disabled/subtitleNumberOfLines`; non-interactive rows render a plain View — no button role).
- **Phase 3 — native headers:** already satisfied by prior commit `e66d454` (large-title list screens + `DETAIL_SCREEN_OPTIONS` for stack/detail/modal). Verified, no change.
- **Phase 4 — screens:** 10 lower-emphasis CTAs `secondary`→`tonal`; 8 bespoke rows → ZListItem (member, schedule-day, session-type, first-step, group-card, blocked-slot, asset-card, notification — notification's accept/decline hoisted to a footer OUTSIDE the row pressable, fixing a latent nested-button a11y trap); settings email-prefs → ZListItem + ZSwitch + ZDivider; two manual `bg-z-border` hairlines → ZDivider.
- **Phase 5 — i18n:** no new keys required (all work reused existing keys; ZSwitch a11y labels = existing row labels; Toast `action` is forward-compatible/unused).
- **Phase 6 — gates:** `make mobile:lint` (0 errors), `mobile:typecheck` (clean), `mobile:test` (100 suites / 696 tests) all green, incl. `primitive-contract`, `native-classname-forwarding`, `theme-roles`, `tokens-sync`.

## Verification
- Every commit passed an independent spec-compliance review and a code-quality review; high-risk work (ZToast iOS banner, ZListItem foundation) got separate two-stage reviews + fix loops (ZToast banner lifecycle guard; ZListItem non-interactive/a11y + richer slots).
- Final holistic cross-cutting review: selection language consistent (secondary-container everywhere it should be), no raw hex / no legacy `-z-` color regressions in touched code, new primitives correctly tier-registered + forwarding-compliant, token foundation integral.

## Deviations from the plan (grounded in the real code)
- **4.4 segment-count overline:** no change needed — Videos already uses the `N VIDEOS` overline (count-free segments), Coaching uses `Label (N)` (count in label, **not** a badge slot — M3-compliant and more informative for a 3-way filter). Both forms are handoff-allowed; forcing uniformity would remove useful per-tab counts.
- **iOS `bordered` (not `borderedProminent`) for ZButton tonal** — correct emphasis tier (soft fill, not primary-like); the plan text was off.

## Open items / follow-ups
1. **DESIGN DECISION (needs device eyes):** the profile email "all" master row uses a direct `className="bg-secondary-container"` for a persistent tonal-emphasis tile, while every other tonal row uses the `selected` prop (which ZListItem intentionally suppresses on iOS per HIG). Net: on iOS the master row shows a tonal fill but other selected rows don't. Decide at iOS screenshot review whether (a) the persistent master emphasis is intended cross-platform (then ideally express it via a first-class platform-aware `tone` prop on ZListItem rather than a raw className), or (b) it should follow the selection contract (consistent, but iOS loses the master emphasis). `mobile/src/app/(tabs)/profile/index.tsx:434`.
2. **Deferred primitive-default tonal migration:** `ZQueryError` retry + `ZAvatarInput` picker still default to `variant="secondary"`. They're recovery/utility CTAs (tonal candidates) but a primitive-default change has app-wide blast radius — decide deliberately (and note a full-screen error retry may warrant `primary`, not `tonal`).
3. **iOS large-title on Home** uses a runtime `headerShown:false` effect (possible first-mount flash) — pre-existing; consider declaring it in `(home)/_layout.tsx`.
4. **Device-screenshot fidelity gate (REQUIRED, human):** jest renders only the bare Material fallback — the iOS HIG variants (ZListItem grouped cell, ZTextInput filled field, the ZToast top banner, ZSwitch UISwitch, card tone fills, nav pill, FAB shape/elevation) and the Android M3 native paths must be smoke-tested on **real iOS + Android dev builds** (not Expo Go/simulator-only) with both-platform screenshots attached to the PR. Visual concerns to verify: row→tile grouping on the availability/schedule/session lists, first-step completed tonal tile inside the divider list, asset-card single-line subtitle, the profile master-row decision above.

## Notes
- Single mobile PR convention: all work is phased commits on `feat/mobile-token-auth`; no intermediate merges to `main`. Not pushed.
