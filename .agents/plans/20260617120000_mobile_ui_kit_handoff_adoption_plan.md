# Mobile UI-Kit Handoff Adoption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the entire mobile `z-*` primitive library — and the screens that compose it — into conformance with the Material-You UI-kit handoff in `mobile/handoffs/handoff_ui_kit/`, full scope, in clear phases on the current branch.

**Architecture:** The handoff is a whole-library contract. We adapt the *primitives* first (which reskins every screen for free), add the three missing primitives, take navigation chrome native, then do the manual screen migration (bespoke rows → `ZListItem`, `secondary`→`tonal`, native headers). A hard token-foundation prerequisite (a new `secondary-container` role pair) blocks most of Phase 1 and must land first.

**Tech Stack:** Expo SDK 56 / React Native, NativeWind (role tokens generated from a brand seed), `@expo/ui` native renderers, expo-router native-stack + NativeTabs, `ZSymbol` icons, `react-i18next`, jest + RNTL.

**Governing rule:** *Im Zweifel gewinnt das Handoff.* Where current code, props, colors, weights, or radii disagree with the handoff, the handoff is correct. Every value here is sourced from existing role tokens — never from the prototype's CSS/hexes (except the four new role hexes the handoff table itself supplies).

---

## Context & Decisions

A Material-3 redesign is already in flight on `feat/mobile-token-auth` (recent commits + modified `z-button`, `z-chip.android`, `z-icon-button`, `z-tabs.android`). This plan was grounded by a read-only multi-agent audit of the **actual** code (not the handoff's possibly-stale "Current:" notes). Net status vs. the handoff table:

- **Adapt (⚠️):** `z-button`, `z-card`, `z-chip`, `z-tabs.android` (SegmentedButton), `z-text-input`, `z-textarea`, `z-fab`, `z-toast` (Snackbar), `(tabs)/_layout` (Android NavigationBar).
- **Create (🆕):** `z-divider`, `z-switch`, `z-list-item`.
- **Already conform (✅):** `z-icon-button`, `z-badge`, `z-avatar`, `z-icon-tile`, `z-select`, `z-field-label`, `z-field-error`, `z-tabs` (iOS/shared), `z-stepper`, `z-empty-state`, `z-skeleton`, `z-progress`, `z-confirm-dialog`. Keep sourced from role tokens; no work beyond regression checks.

### Resolved handoff open-questions (per "Handoff wins")
1. **Tonal rollout:** add `tonal` (non-breaking) **and** migrate the genuine "lower-emphasis primary" `secondary` call-sites listed in Phase 4.
2. **Segment counts:** M3-clean — move counts to an `N VIDEOS` overline above the list, not inside the segment (M3 segments have no badge slot). Keep the existing `Label (N)` only if a screen has no room for an overline.
3. **ZListItem adoption:** full migration now (Phase 4), clean-fit rows first.
4. **Snackbar swap:** global — `showToast` API unchanged, only the view changes.
5. **Headers:** native everywhere (iOS `headerLargeTitle` / Android M3 small top app bar), `headerShown:false` only on Home (in-content greeting).

### Two grounded gotchas the implementer MUST respect
- **`roles.ts`, `colors.ts`, `global.css` are GENERATED** by `mobile/scripts/sync-tokens.mjs` (`roles.ts` line 1 says "do not edit by hand"). Add the new roles **in the generator** and run `pnpm run sync:tokens`. `native.ts` `Role` type (`keyof typeof roles.light`) and the role-key flow pick them up automatically.
- **NativeWind class namespace:** the codebase mixes flat role-token classes (`bg-accent-container`, used by newer code + `tailwind.config.js`) and a legacy `z-` palette (`bg-z-primary-strong`, used inside `z-button.tsx`). **Standardise the new tonal classes on the flat role-token names** (`bg-secondary-container`, `text-on-secondary-container`). When editing a file that still uses `bg-z-*`, check `tailwind.config.js` and use whichever namespace that file's surrounding classes already resolve against; mirror the token into the legacy `z.*` palette only if a file you must touch depends on it.

### Radius normalisation (NativeWind)
Handoff dp → class: field **12** = `rounded-xl`; tile/row **16** = `rounded-2xl`; card **20** = `rounded-[20px]`; hero/sheet **28** = `rounded-[28px]`; pill = `rounded-full`; FAB **16** rounded-square = native shape modifier. (The audit agents quoted a few wrong classes — `rounded-lg`/`rounded-3xl` for 12dp; use `rounded-xl`.)

---

## Phase 0 — Token foundation (blocks Phase 1) 🔴 prerequisite

### Task 0.1: Add `secondaryContainer` / `onSecondaryContainer` roles to the generator

**Files:**
- Modify: `mobile/scripts/sync-tokens.mjs` (LIGHT_ROLES ~lines 86–117; DARK_ROLES ~lines 119–150)
- Generated (do **not** hand-edit): `mobile/src/theme/roles.ts`, `mobile/src/theme/colors.ts`, `mobile/global.css`
- Modify: `mobile/tailwind.config.js` (`theme.extend.colors`, ~lines 26–54)
- Modify (test gate): `mobile/src/__tests__/theme-roles.test.ts` (`REQUIRED` array, line 2)

- [ ] **Step 1 — Add the roles to the generator.** In `LIGHT_ROLES` add `secondaryContainer: '#ffdcc4'` and `onSecondaryContainer: '#5a3214'`; in `DARK_ROLES` add `secondaryContainer: '#5d4030'` and `onSecondaryContainer: '#ffdcc4'`. Place them right after `accentStrong` to follow the accent/onAccent pairing.
- [ ] **Step 2 — Update the exhaustiveness gate first.** In `theme-roles.test.ts`, add `'secondaryContainer'` and `'onSecondaryContainer'` to the `REQUIRED` array (12 → 14). (Do this *before* regenerating so the gate passes in one commit.)
- [ ] **Step 3 — Regenerate.** Run `pnpm run sync:tokens` (via WSL). Confirm `roles.ts`, `colors.ts`, and the `global.css` `:root` + dark block now contain the two CSS vars (`--role-secondary-container`, `--role-on-secondary-container`).
- [ ] **Step 4 — Wire NativeWind.** In `tailwind.config.js` add `'secondary-container': 'var(--role-secondary-container)'` and `'on-secondary-container': 'var(--role-on-secondary-container)'` next to `accent-container`. This makes `bg-secondary-container` / `text-on-secondary-container` / `border-secondary-container` resolve.
- [ ] **Step 5 — Verify.** Run (WSL): `make mobile:typecheck && pnpm --filter mobile test theme-roles tokens-sync`. Expected: PASS (Role type now includes the new keys; gate green).
- [ ] **Step 6 — Commit.** `feat(mobile): add secondary-container role tokens (handoff)`

**Note:** No bare `secondary` swatch is added — the handoff only uses the `-container` pair. If a later need arises for secondary text/border, that's separate spec work (M3 secondary hue ≠ accent).

---

## Phase 1 — Adapt existing primitives (⚠️)

> Each task: edit the primitive only (not screens). Keep the bare `.tsx` fallback fully working (it is the jest/Storybook contract). Native `.ios/.android` files must forward `className`/`style` onto the outer `<View>` wrapping `<Host>` (enforced by `src/__tests__/native-classname-forwarding.test.ts`). End each task with `make mobile:lint && make mobile:typecheck && make mobile:test` + the component's own test.

### Task 1.1: `ZButton` — add `tonal` variant + pill fallback

**Files:** `z-button.types.ts`, `z-button.tsx`, `z-button.android.tsx`, `z-button.ios.tsx`, `z-button.test.tsx`
**Already done:** label 600, 40dp min/48dp touch, accentStrong primary, link uses onAccentContainer, loading spinner, leading icon, content-width wrapper, className forwarding both platforms.

- [ ] **Step 1 — Types.** Extend `ZButtonVariant` (line 16) to `'primary' | 'tonal' | 'secondary' | 'ghost' | 'danger' | 'link'`; document `tonal` = secondary-container fill, recommended lower-emphasis action.
- [ ] **Step 2 — Fallback test (TDD).** In `z-button.test.tsx`, add a test asserting `variant="tonal"` renders the secondary-container fill class and `rounded-full`. Run it → FAIL.
- [ ] **Step 3 — Bare `.tsx`.** Add `tonal` to `containerClasses` (`bg-secondary-container` + an `active:` warm state), `labelClasses` (`text-on-secondary-container`), `spinnerColor` (`colors.onSecondaryContainer`). Change non-link `chromeClasses` (line ~69) from `rounded-lg` to `rounded-full`.
- [ ] **Step 4 — Android.** Add a `tonal` branch (before the final `else`, ~lines 87–139): `containerColor: color('secondaryContainer')`, `contentColor: color('onSecondaryContainer')`, disabled → `surfaceVariant`/`onSurfaceVariant`.
- [ ] **Step 5 — iOS.** `STYLE_MAP` (line 46) `tonal: 'borderedProminent'`; `ROLE_MAP` (line 55) `tonal: 'default'`; extend the tint modifier (~83–90) so `tonal` tints `color('secondaryContainer')`.
- [ ] **Step 6 — Verify + commit.** Tests green; `make mobile:test`. Commit `feat(mobile): ZButton tonal variant + pill radius (handoff)`.

### Task 1.2: `ZCard` — tonal surface default + `tone` + `hero`

**Files:** `z-card.types.ts`, `z-card.tsx`, `z-card.ios.tsx`, `z-card.android.tsx`, `z-card.test.tsx`
**Already done:** default surface fill, borderless, p-4, role tokens, className forwarding both platforms.

- [ ] **Step 1 — Types.** Add `tone?: 'surface' | 'accent' | 'secondary'` (default `'surface'`), `hero?: boolean`, and `variant?: 'filled' | 'outlined' | 'elevated'` (default `'filled'`; `outlined`/`elevated` are the legacy looks).
- [ ] **Step 2 — Test (TDD).** Assert `tone="accent"` → `bg-accent-container`, `tone="secondary"` → `bg-secondary-container`, `hero` → `rounded-[28px]`, default → `rounded-[20px] bg-surface` and no border. FAIL first.
- [ ] **Step 3 — Bare `.tsx`.** Replace `rounded-2xl bg-z-surface` with `rounded-[20px] bg-surface` (no border). Assemble classes: `tone='accent'`→`bg-accent-container`, `tone='secondary'`→`bg-secondary-container`, `hero`→`rounded-[28px]`, `variant='outlined'`→`border border-outline bg-white`, `variant='elevated'`→`shadow-sm`. Keep `className` forwarding.
- [ ] **Step 4 — Android.** `containerColor` via `useRoleColors()` per tone (`surface`/`accentContainer`/`secondaryContainer`); shape radius 20dp default / 28dp hero; `outlined` → surface + border overlay; `elevated` → elevation ~2dp. Keep inner 16dp padding.
- [ ] **Step 5 — iOS.** Inset-grouped: corner 14dp (change current 16→14), white fill default; tone maps to `accentContainer`/`secondaryContainer` fills; `hero` 28dp; implement `outlined`/`elevated` branches.
- [ ] **Step 6 — Verify + commit.** `feat(mobile): ZCard tonal surface + tone/hero (handoff)`.

### Task 1.3: `ZChip` — secondary-container + leading check

**Files:** `z-chip.types.ts`, `z-chip.tsx`, `z-chip.android.tsx`, `z-chip.ios.tsx`, `z-chip.test.tsx`
**Already done (iOS):** capsule, no check, tinted border — matches spec; only weight tweak needed. Unselected outlined surface OK.

- [ ] **Step 1 — Types.** Add `showCheck?: boolean` (default `true`).
- [ ] **Step 2 — Test (TDD).** Selected fallback renders `bg-secondary-container` + `text-on-secondary-container` + a `check` `ZSymbol` + `font-bold` + `rounded-xl`. FAIL first.
- [ ] **Step 3 — Bare `.tsx`.** Selected: `border-secondary-container bg-secondary-container text-on-secondary-container` (was accent-container); render `<ZSymbol name="check" />` (≈18px, accent) before label when `selected && showCheck !== false`; label `font-medium`→`font-bold` (700); container `rounded-full`→`rounded-xl` (12dp).
- [ ] **Step 4 — Android.** `activeContainerColor` `accentContainer`→`secondaryContainer`; active content `onSurface`→`onSecondaryContainer`; ensure FilterChip leading check + label weight 700.
- [ ] **Step 5 — iOS.** Apply 15px/600 weight on the chip label (verify `buttonStyle('bordered')` weight; add Font modifier if needed). iOS keeps **no** check (ignores `showCheck`).
- [ ] **Step 6 — Verify + commit.** `feat(mobile): ZChip secondary-container + leading check (handoff)`.

### Task 1.4: `SegmentedButton` (`z-tabs.android`) — secondary-container selection

**Files:** `z-tabs.android.tsx` (bare `z-tabs.tsx` / `.ios.tsx` unaffected — underline/page-tabs)
**Already done:** full-width (`Host matchContents`), accent border, M3 check, `Label (N)` counts.

- [ ] **Step 1.** Line ~42: `activeContainerColor` `color('accentContainer')`→`color('secondaryContainer')`.
- [ ] **Step 2.** Line ~46: `activeContentColor` `color('onSurface')`→`color('onSecondaryContainer')`; update the stale AA-contrast comment (now vs secondary-container).
- [ ] **Step 3.** Ensure `SegmentedButton.Label` text weight 600.
- [ ] **Step 4 — Verify + commit.** `make mobile:typecheck && make mobile:test`. `feat(mobile): segmented button secondary-container selection (handoff)`. (Count-overline change lives with the screens in Phase 4.)

### Task 1.5: `ZTextInput` — M3 outlined contract + iOS filled

**Files:** `z-text-input.tsx`, `z-text-input.ios.tsx`, `z-text-input.android.tsx`, `z-text-input.test.tsx`
**Already done (Android):** M3 `OutlinedTextField` with role-token focus/error colors; controlled sync; external label; disabled/error states.

- [ ] **Step 1 — Bare `.tsx` (contract).** `min-h-11`→`min-h-14` (44→56dp); `rounded-md`→`rounded-xl` (12dp); add no-shift focus ring `focus:border-accent focus:ring-1 focus:ring-inset focus:ring-accent`; ensure border classes use role tokens (`border-outline`, invalid `border-danger`). Add a jest assertion for `min-h-14` + `rounded-xl`.
- [ ] **Step 2 — iOS.** Add `surfaceVariant`/systemGray6 fill, remove border, `cornerRadius(10)`, 17px text (filled gray field, no outline).
- [ ] **Step 3 — Android.** Verify the 2dp accent focus indicator causes no layout reflow on a device build (no code change expected).
- [ ] **Step 4 — Verify + commit.** `feat(mobile): ZTextInput M3 outlined 56dp + iOS filled (handoff)`.

### Task 1.6: `ZTextarea` — same outlined treatment

**Files:** `z-textarea.tsx` (`.ios/.android` already M3-correct: full rounded border, no bottom-only line)

- [ ] **Step 1 — Bare `.tsx`.** `min-h-20`→`min-h-14`; `rounded-md`→`rounded-xl` (12dp); add `focus:border-accent focus:ring-1 focus:ring-inset focus:ring-accent`; role-token borders only.
- [ ] **Step 2 — Verify (`.ios/.android` no-change confirm) + commit.** `feat(mobile): ZTextarea M3 outlined contract (handoff)`.

### Task 1.7: `ZFab` — add `tone`, M3 shape/elevation

**Files:** `z-fab.types.ts`, `z-fab.tsx`, `z-fab.android.tsx`, `z-fab.test.tsx` (iOS returns null — correct)
**Already done:** Android-only, extended default true, className forwarding. **Correction:** `onAccentContainer` already exists in `roles.ts` — no token dep.

- [ ] **Step 1 — Types.** Add `tone?: 'primary' | 'tonal'` (default `'primary'`).
- [ ] **Step 2 — Test (TDD).** Fallback: `tone="primary"`→`bg-accent`, `tone="tonal"`→`bg-accent-container`; extended pill = `rounded-full`. FAIL first.
- [ ] **Step 3 — Bare `.tsx`.** Apply tone fills (`bg-accent`/`text-on-accent` vs `bg-accent-container`/`text-on-accent-container`); extended `rounded-2xl`→`rounded-full`.
- [ ] **Step 4 — Android.** Container color conditional: `tone==='primary' ? color('accentStrong') : color('accentContainer')` (round FAB line ~28 + extended line ~44); extended label color `onAccent` vs `onAccentContainer` (line ~51).
- [ ] **Step 5 — M3 shape/elevation (risk: high).** Verify `@expo/ui` `FloatingActionButton` collapsed corner = 16dp rounded-square and resting elevation ~6dp; add a shape/elevation modifier if the API exposes one. If `@expo/ui` bakes defaults and exposes no lever, document the limitation in the PR.
- [ ] **Step 6 — Verify + commit.** `feat(mobile): ZFab tone + M3 shape (handoff)`.

### Task 1.8: `ZToast` (Snackbar) — dark M3 pill / iOS top banner ⚠️ highest-risk view change

**Files:** `z-toast.shared.tsx` (`ToastCard`), `z-toast.tsx` (fallback), `z-toast.android.tsx`, `z-toast.ios.tsx`, `z-toast.types.ts`, `z-toast.test.tsx`
**Unchanged:** imperative `showToast(title, message, tone)`, store/`useToasts`, auto-dismiss. **Only the view changes.**

- [ ] **Step 1 — Types.** Add optional `action?: { label: string; onPress: () => void }` to the toast type (forward-compatible; existing calls unaffected).
- [ ] **Step 2 — Shared `ToastCard`.** Remove the dismiss `ZIconButton` (M3 has no X). Single-line `flex-row items-center`; replace the icon tile with a small tone-colored leading dot; compact padding (`p-3`); `rounded` 4dp; **dark inverse pill** colors `bg-on-surface text-surface`; intrinsic width (`self-center`/`w-auto`), host positions it.
- [ ] **Step 3 — Android.** Map tones to M3 roles: `info`→`onSurface`/`surface` (inverts current), `success`→`successContainer`/`onSuccessContainer`, `error`→`dangerContainer`/`onDangerContainer`; bottom anchor (already), `withDismissAction=false`, optional accent action label.
- [ ] **Step 4 — iOS (risk: high — diverges from current `burnt` HUD).** Per handoff, render a **custom light top banner** (opaque surface card, soft shadow, leading status dot, optional tinted action) instead of `burnt.toast()`. Keep the store subscription; render an RN banner at the top. *This is the one place the handoff overrides the existing AGENTS.md "iOS = native HUD" guidance — flagged in Risks.*
- [ ] **Step 5 — Fallback `z-toast.tsx`.** Render the dark inverse pill (the jest/Storybook contract).
- [ ] **Step 6 — Tests.** The existing "press dismiss removes toast" test (≈ line 59) breaks (X removed) — replace with an auto-dismiss/timeout assertion or a manual-dismiss API call. Update the Storybook matrix expectation (dark pills).
- [ ] **Step 7 — Verify + commit.** `feat(mobile): ZToast M3 snackbar / iOS top banner (handoff)`.

### Task 1.9: Android `NavigationBar` pill — secondary-container

**Files:** `mobile/src/app/(tabs)/_layout.tsx` (line ~57). iOS UITabBar already HIG-correct.

- [ ] **Step 1.** `indicatorColor: roleColor('accentContainer', scheme)` → `roleColor('secondaryContainer', scheme)` (the 64×32 active pill). 80dp bar / 24dp icons / labeled mode already correct.
- [ ] **Step 2 — Verify + commit.** `make mobile:typecheck`. `fix(mobile): nav pill uses secondary-container (handoff)`.

---

## Phase 2 — New primitives (🆕)

> Each: `.types.ts` (declare tier) + working bare `.tsx` fallback + platform files where the spec diverges. If `.types.ts` declares `className`, every `.ios/.android` file for that primitive MUST reference it (forwarding test). Test-first on the public API via the bare fallback.

### Task 2.1: `ZDivider` (low risk)

**Files (create):** `z-divider.types.ts`, `z-divider.tsx`, `z-divider.ios.tsx`, `z-divider.android.tsx`, `z-divider.test.tsx`. Tier: **Custom-RN** (no OS widget).

- [ ] **Step 1 — Types.** `vertical?: boolean` (default false), `inset?: boolean` (default false), `platform?: 'material' | 'ios'`, `className?`, `style?`, `testID?`.
- [ ] **Step 2 — Test (TDD).** Renders a thin `View` with the `outline` token; inset adds 16dp margin; vertical swaps axis. FAIL first.
- [ ] **Step 3 — Bare `.tsx`.** Horizontal default `h-px w-full bg-outline`; vertical `w-px h-full bg-outline`; inset → `mx-4`/`my-4`. Forward `className` on the wrapper.
- [ ] **Step 4 — Platform files.** `.ios.tsx`: 0.5pt line, `color('outline')`, inset 16. `.android.tsx`: 1dp line, `color('outline')`, inset 16. Both destructure `className` onto the wrapper.
- [ ] **Step 5 — Verify + commit.** `feat(mobile): add ZDivider primitive (handoff)`.

### Task 2.2: `ZSwitch` (wraps RN native `Switch`)

**Files (create):** `z-switch.types.ts`, `z-switch.tsx`, `z-switch.test.tsx`. Tier: **Native** (RN core `Switch` is already the native UISwitch / Android M3 Switch — no `@expo/ui`, no platform split needed). Model the controlled API on `z-checkbox.types.ts`.

- [ ] **Step 1 — Types.** `checked: boolean`, `onChange: (checked: boolean) => void`, `disabled?`, `accessibilityLabel: string`, `className?`, `style?`, `testID?`.
- [ ] **Step 2 — Test (TDD).** Renders RN `Switch`; `onValueChange` fires `onChange`; reflects `checked`/`disabled`; `accessibilityLabel` set. FAIL first.
- [ ] **Step 3 — Implement `z-switch.tsx`.** `import { Switch } from 'react-native'`; theme with `useRoleColors()`: `trackColor={{ true: color('accent'), false: color('outline') }}` (handoff's `surface-4` is a stale token — use `outline`), `thumbColor` white (`onAccent`), `ios_backgroundColor` neutral. Wrap in `<View className={className} style={style}>` (content-width).
- [ ] **Step 4 — Verify + commit.** `feat(mobile): add ZSwitch primitive (handoff)`.
  *Note:* if a future need forces platform divergence, split into `.ios/.android` mirroring `z-checkbox` then — not now.

### Task 2.3: `ZListItem` (risk: high on native files)

**Files (create):** `z-list-item.types.ts`, `z-list-item.tsx`, `z-list-item.ios.tsx`, `z-list-item.android.tsx`, `z-list-item.test.tsx`. Tier: **Native**. Model file structure on `z-button` (3-surface split) + `z-card`.

- [ ] **Step 1 — Types.** `leading?: ReactNode`, `title: string`, `subtitle?: string`, `trailing?: ReactNode`, `onPress?: () => void`, `selected?: boolean`, `disabled?: boolean`, `className?`, `style?`, `testID?`.
- [ ] **Step 2 — Test (TDD).** Renders title/subtitle/leading/trailing nodes; `onPress` fires; `selected`/`disabled` accessibility state. FAIL first.
- [ ] **Step 3 — Bare `.tsx`.** `Pressable` row: leading (~48dp) | `title` (15/`font-bold`) + `subtitle` (13px) stacked | trailing. `rounded-2xl bg-surface py-2 px-4`, no border; `selected`→`bg-secondary-container`. Forward `className`.
- [ ] **Step 4 — Android.** M3 row, Surface container bg; title 15/700, subtitle 13/400; selected `secondaryContainer`/`onSecondaryContainer`; ripple state layer; 16dp tile radius; `className` on wrapper; `testID` modifier.
- [ ] **Step 5 — iOS.** Inset-grouped cell: square corners (card clips), taller padding (16dp v / 12dp h); title 17px regular, subtitle 15px secondary; system pressed dim (no tonal fill); `className` on wrapper.
- [ ] **Step 6 — Verify + commit.** `feat(mobile): add ZListItem primitive (handoff)`.

---

## Phase 3 — Native headers & navigation

### Task 3.1: List/index screens → native large-title / M3 top app bar

**Files:** `(tabs)/videos/index.tsx`, `(tabs)/coaching/index.tsx`, `(tabs)/groups/index.tsx`, `(tabs)/profile/index.tsx`

- [ ] **Step 1.** Add `Stack.Screen options={{ headerLargeTitle: true }}` (iOS large title; Android renders the M3 small top app bar by default). Keep existing platform-split actions: iOS `headerRight` ("+"/qr-code/etc.), Android FAB.
- [ ] **Step 2.** Confirm Home stays `headerShown:false` (in-content greeting). No double header.
- [ ] **Step 3 — Verify + commit.** `feat(mobile): native large-title headers on list screens (handoff)`.

### Task 3.2: Detail/stack/modal header pass

**Files:** `asset/[id].tsx`, `availability.tsx`, `notifications.tsx`, `reports.tsx`, `group/[id].tsx`, `book.tsx`, `upload.tsx`

- [ ] **Step 1.** Confirm native titles + `headerBackButtonDisplayMode:'minimal'` on detail screens; `formSheet`/`modal` headers correct on `upload`/`book` (already). Adjust only where a screen lacks a native header.
- [ ] **Step 2 — Verify + commit.** `fix(mobile): native header pass on stack/detail screens (handoff)`.

---

## Phase 4 — Screen migration (full conformance)

### Task 4.1: `secondary` → `tonal` migration (lower-emphasis primaries)

**Files (from audit, `migrate_to_tonal=true`):** `upload.tsx:160` (select video), `invite.tsx:134` (camera permission), `invite.tsx:202` (retry invite), `group/[id].tsx:116` (retry members), `group/[id].tsx:350` (copy link), `group/[id].tsx:358` (download QR), `asset/[id].tsx:192` (retry comments), `asset/[id].tsx:371` (retry asset), `review-item.tsx:129` (enhance/AI), `next-session-card.tsx:107` (view details).

- [ ] **Step 1.** Change each listed call-site `variant="secondary"` → `variant="tonal"`. **Leave true secondaries** (sheet/dialog cancels, back/step, decline, sign-out, edit-cancel) unchanged.
- [ ] **Step 2 — Sweep.** Grep `variant="secondary"` across `mobile/src/app` + `mobile/src/components` and confirm each remaining one is a genuine dismiss/back/decline (the audit classified 12 true secondaries — re-verify none were missed).
- [ ] **Step 3 — Verify + commit.** `make mobile:lint`. `refactor(mobile): migrate lower-emphasis CTAs to tonal (handoff)`.

### Task 4.2: Bespoke rows → `ZListItem` (clean-fit first)

**Clean-fit (migrate):** `member-row.tsx`, `schedule-day-row.tsx`, `session-type-row.tsx`, `first-step-row.tsx`, `group-card.tsx`, the inline blocked-slot row in `availability.tsx:740-773`.
**Partial (adapt with custom trailing slots):** `notification-row.tsx`, `asset-card.tsx`.
**Keep bespoke (do NOT migrate):** `booking-card.tsx`, `next-session-card.tsx`, `review-item.tsx`.

- [ ] **Step 1.** Migrate each clean-fit row to compose `ZListItem` (leading/title/subtitle/trailing/onPress/selected). Preserve current data, i18n keys, and query-state behavior.
- [ ] **Step 2.** Add `ZDivider` where rows stack on a card (e.g. profile email-prefs, availability lists, first-steps).
- [ ] **Step 3.** Adapt the 2 partial rows using `ZListItem` `trailing`/`leading` custom slots; keep their inline actions/badges.
- [ ] **Step 4 — Verify + commit per row group.** `make mobile:test`. `refactor(mobile): adopt ZListItem for <row> (handoff)`.

### Task 4.3: Settings switch rows → `ZListItem` + `ZSwitch`

**Files:** `(tabs)/profile/index.tsx:442-461` (email preferences — currently ad-hoc `View` + `ZCheckbox`), plus any group-preferences/notifications toggles.

- [ ] **Step 1.** Replace ad-hoc checkbox-in-card rows with `ZListItem` (`trailing={<ZSwitch .../>}`), `ZDivider` between rows.
- [ ] **Step 2 — Verify + commit.** `refactor(mobile): settings rows use ZListItem + ZSwitch (handoff)`.

### Task 4.4: Segment count overline

**Files:** screens using `z-tabs` segments with counts (e.g. videos/sessions filters).

- [ ] **Step 1.** Move segment counts to an `N VIDEOS`-style overline above the list; drop in-segment `(N)` where the overline reads cleaner.
- [ ] **Step 2 — Verify + commit.** `refactor(mobile): segment counts as overline (handoff)`.

---

## Phase 5 — i18n & copy

### Task 5.1: New keys for any added copy

- [ ] **Step 1.** Any new user-facing string (e.g. count overlines, toast action labels, switch `accessibilityLabel`s) → add keys to the **web JSON sources**, run `pnpm run sync:i18n`, then **re-add mobile-only keys by hand** (sync is destructive — drops keys like `sessions.call.sessionFallback`). Sentence case, no emoji, tabular numbers.
- [ ] **Step 2 — Verify.** en + de + fr present for every new key. Commit `chore(mobile): i18n keys for UI-kit copy`.

---

## Phase 6 — Verification gate 🔴 required before sign-off

### Task 6.1: Green gate

- [ ] `make mobile:lint`
- [ ] `make mobile:typecheck` (must cover `.ios.tsx` / `.android.tsx` / `.types.ts`)
- [ ] `make mobile:test` — incl. `native-classname-forwarding.test.ts` (new `className` props on `ZListItem`/`ZSwitch`/`ZDivider` honored), `theme-roles.test.ts`, `tokens-sync.test.ts`, updated `z-toast` test.
- [ ] Storybook renders (react-native-web-vite) for changed primitives.

### Task 6.2: Device-screenshot fidelity gate (NOT optional)

Green tests ≠ done — the forwarding bug and native renders are invisible to jest. On **real iOS + Android dev builds** (not Expo Go, not just simulator):

- [ ] Capture both platforms for: a tonal button + filled card, selected chip, segmented filter, focused text input, FAB, snackbar/toast, the nav pill, a migrated `ZListItem` list, a settings row with `ZSwitch`, and the large-title headers — light **and** dark.
- [ ] Compare against `design-references/index.html` (Tweaks → Platform Material/iOS, Theme Hell/Dunkel). Attach to the PR (mobile PR rule: both-platform screenshots).

---

## Risks & follow-ups

- **`ZToast` iOS top banner** replaces the current `burnt` native HUD — the single place this work overrides the existing `mobile/AGENTS.md` "iOS = native HUD" guidance. Per "Handoff wins" we implement the banner, but confirm during review it feels native (or treat the HUD as an acceptable iOS idiom if the banner regresses UX).
- **`ZFab` 16dp shape / 6dp elevation** depend on `@expo/ui` exposing shape/elevation levers; if baked into defaults, document rather than hack.
- **Tonal rollout** is non-breaking; the 10 flagged migrations are judgment calls — re-confirm during review that none are true secondaries.
- **`secondary-container` is container-only**; a bare secondary swatch is out of scope until a text/border need appears.
- **Single mobile PR:** this lands on `feat/mobile-token-auth` as phased commits (no intermediate merges to `main`).

## Verification commands (WSL)
```
wsl.exe -d ubuntu bash -lc 'cd mobile && pnpm run sync:tokens'
make mobile:lint && make mobile:typecheck && make mobile:test
```
