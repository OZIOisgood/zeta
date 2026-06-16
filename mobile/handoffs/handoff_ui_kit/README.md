# Handoff: Strido Mobile UI Kit → React Native

## Overview
This is the **engineering handoff for the complete Strido mobile UI kit** — the
Material You (Android-forward) design system, rendered as a click-through phone
mock in `design-references/`. It targets the production **Expo / React Native +
NativeWind** app in `mobile/`, and it is the **source of truth for the whole
`Z*` primitive library** (`src/components/ui/z-*.tsx`), not a single screen.

**Read this first — the contract:**
1. The handoff applies to the **entire UI kit**. Every primitive below has a
   target spec; the app's existing `Z*` component is measured against it.
2. **Where an existing `Z*` component does not match this handoff, adapt the
   `Z*` component** — change the primitive, not the screens. Screens compose
   primitives; fixing the primitive propagates everywhere.
3. **Prefer native platform components.** When a platform ships the control
   (RN `Switch`, native navigation header, Android M3 `NavigationBar`, iOS
   `UIMenu`/`UIAlertController`), render *that* and theme it with role tokens —
   do not re-draw it from `View`s.
4. **In case of doubt, the handoff wins.** If a current `Z*` prop, color, weight
   or radius disagrees with the spec here, the spec here is correct.

## Fidelity
**High-fidelity.** Colours, type weights, spacing, radii, and per-platform
component choices are deliberate. Recreate them precisely — but source every
value from the **existing tokens** (`src/theme/roles.ts`, `colors.ts`,
`native.ts`, `useRoleColors()`, NativeWind `bg-accent` / `text-on-surface` …),
**never** from the prototype's CSS variables.

---

## About the design files
`design-references/index.html` is a **browser prototype** (HTML/React, inline
styles, the compiled DS bundle). It shows the intended look, layout and the
per-platform variants — open it and flip the **Tweaks → Platform** control
between *Material* and *iOS*, and **Theme** between *Hell/Dunkel*. It is **not**
production code to port. Do not copy its hexes or its DOM. Rebuild the intent in
the RN codebase with the existing components, tokens, `ZSymbol` icons,
`react-i18next` copy and data hooks.

---

## One contract, a `platform` prop
The kit is **cross-platform from a single API**. Controls that render as a
*distinct native control* per OS expose `platform="material" | "ios"` on the
**same** props — no forked components, no forked tokens. In the app this is the
existing `.ios.tsx` / `.android.tsx` split behind one `z-*.tsx` contract. Keep
that pattern: the contract file (`z-foo.tsx`) is the web/Storybook/jest surface
**and the prop contract**; the native renderers implement it.

- **Per-platform native split:** `Button`, `IconButton`, `SegmentedButton`
  (`ZTabs` on Android), `NavigationBar`, `Tabs`, `Stepper`, `Switch`,
  `TextInput`, `Textarea`, `Select`, `FieldLabel`, `Chip`, `Card`, `ListItem`,
  `Divider`, `Dialog`, `Snackbar`, `LargeTitleBar`, `TopAppBar`.
- **Shared (token-reskin only, no native split):** `Avatar`, `Badge`,
  `IconTile`, `Skeleton`, `EmptyState`, `FieldError`, `ProgressBar`.
- **`Fab` is Android-only.** On iOS use a `LargeTitleBar` trailing action.

---

# Component handoff — per-primitive deltas

Legend for **Status**: ✅ matches the spec · ⚠️ exists but **must be adapted** ·
🆕 **missing — create it**. "Adapt the `Z*`" means edit `src/components/ui/z-*`.

| DS primitive | App component | Status | Required adaptation (handoff wins) |
|---|---|---|---|
| Button | `z-button.*` | ⚠️ | Add the **`tonal`** variant; pill radius on the contract |
| IconButton | `z-icon-button.*` | ✅ | — (verify FAB = `primary`/`lg`, circle shape option) |
| Fab | `z-fab.*` | ⚠️ | Add `tone` (primary/tonal); 16dp square; keep extended |
| Card | `z-card.*` | ⚠️ | Filled **tonal** surface; add `tone` + `hero` |
| Badge | `z-badge.*` | ✅ | Confirm 5 tones map to role containers |
| Chip | `z-chip.*` | ⚠️ | Selected = **secondary-container** + leading check |
| Avatar | `z-avatar.*` | ✅ | Initials fallback (already supported) |
| ListItem | — | 🆕 | Create `ZListItem` (Pressable row) |
| IconTile | `z-icon-tile.*` | ✅ | — |
| Divider | — | 🆕 | Create `ZDivider` (1px / iOS 0.5px inset View) |
| TextInput | `z-text-input.*` | ⚠️ | M3 outlined, **2dp accent on focus**, 56dp |
| Textarea | `z-textarea.*` | ⚠️ | Same outlined treatment, no bottom-only line |
| Select | `z-select.*` | ✅ | Native menu/picker; outlined to match TextInput |
| Switch | — | 🆕 | Create `ZSwitch` wrapping **RN native `Switch`** |
| FieldLabel | `z-field-label.*` | ✅ | — |
| FieldError | `z-field-error.*` | ✅ | — |
| SegmentedButton | `z-tabs.android` | ⚠️ | Selected = **secondary-container** tokens; full-width |
| Tabs | `z-tabs.*` | ✅ | Underline (material) ↔ page tabs (iOS) |
| NavigationBar | native tabs (`app/(tabs)/_layout`) | ⚠️ | Android M3 `NavigationBar` pill (64×32); native tab bar |
| TopAppBar | native header | 🆕 | Standardise an M3 small top app bar |
| LargeTitleBar | native header | 🆕 | iOS large-title header (`headerLargeTitle`) |
| Stepper | `z-stepper.*` | ✅ | Numbered (material) ↔ page dots (iOS) |
| EmptyState | `z-empty-state.*` | ✅ | — |
| Skeleton | `z-skeleton.*` | ✅ | — |
| ProgressBar | `z-progress.*` | ✅ | 6dp material / 4dp iOS |
| Dialog | `z-confirm-dialog.*` | ✅ | `AlertDialog` ↔ `UIAlertController` |
| Snackbar | `z-toast.*` | ⚠️ | Material = **dark bottom pill**, not a bordered card |

Below: only the ⚠️ / 🆕 rows are detailed. The ✅ rows already conform — just
keep them sourced from role tokens.

---

## ⚠️ Button — add the `tonal` variant + pill radius
**Current:** `z-button.tsx` fallback renders `rounded-lg px-4 py-3` with variants
`primary | secondary | ghost | danger | link`. The Android Compose renderer is
already an M3 pill.

**Adapt to:**
- **Add `tonal`** as a first-class variant — the **secondary-container** fill
  (`bg-secondary-container` / `text-on-secondary-container`; native:
  `containerColor: color('secondaryContainer')`). This is the *recommended
  lower-emphasis action* and is used across the kit (hero "Details", row
  actions). Variant set becomes
  `primary | tonal | secondary | ghost | danger | link`.
- **Pill on the contract surface** too: the web/Storybook fallback must be
  full-radius (`rounded-full`), not `rounded-lg`, so the test/Storybook surface
  matches the native pill.
- Keep: label **600**, 40dp min height / **48dp** touch target, ember
  `accentStrong` primary fill, AA-safe `onAccentContainer` for accent text,
  `loading` spinner, leading `icon`, content-width wrapper.
- M3 state layer (hover 8 / focus 10 / pressed 12 % `currentColor`); iOS
  press-dims.

## ⚠️ Fab — add `tone`, 16dp square
**Current:** `z-fab.android` always fills `accentStrong`, `extended` default
`true`. **Adapt:** add a **`tone`** prop — `primary` (accent fill, default) vs
`tonal` (accent-container). Keep `extended` (the kit's "Hochladen" / "Session
buchen" FABs are extended). M3 **16dp** rounded-square corner for the collapsed
FAB; `--shadow-fab` resting elevation. Android-only — on iOS surface the same
action as a `LargeTitleBar` trailing icon, never a floating button.

## ⚠️ Card — filled tonal + `tone` + `hero`
**Current:** `z-card.tsx` is `rounded-2xl bg-z-surface p-4`, borderless, no
variants.

**Adapt to:**
- Default fill is the warm **tonal `surface` tier** (`--role-surface-1`;
  native `surface`), **20dp** radius, **no border** (the tint carries elevation —
  Material You). Drop `bg-z-surface` (near-white) for the tonal surface.
- Add **`tone="surface" | "accent" | "secondary"`** — `accent` = accent-container
  (hero / "Nächste Session" card), `secondary` = secondary-container.
- Add **`hero`** → bumps the corner to **28dp** for the most prominent surface.
- Keep `outlined` (white + warm hairline) and `elevated` (soft shadow) as legacy
  options. Default padding 16. iOS variant = plain white inset-grouped card,
  14dp continuous corners.

## ⚠️ Chip — secondary-container + leading check
**Current:** `z-chip.tsx` selected = `bg-accent-container` /
`text-on-accent-container`, no check, label `font-medium` (500).

**Adapt to (material):** selected fills with the **secondary-container**
(`bg-secondary-container` / `text-on-secondary-container`) — the warm "on" state,
distinct from the ember accent — with a **leading check** glyph
(`ZSymbol name="check"`), `showCheck` default `true`, 12dp radius, label **700**
(13.5px). Unselected = outlined surface. **iOS:** capsule — gray ↔ accent fill,
no check, 15/600. For a full-width filter use `SegmentedButton`, not a chip row.

## ⚠️ SegmentedButton (`z-tabs.android`) — secondary-container selection
**Current:** the Android `SingleChoiceSegmentedButtonRow` selects with
`activeContainerColor: accentContainer` + `activeContentColor: onSurface` +
`accent` border.

**Adapt to:** the selected segment is the **secondary-container** soft "on" state
to match the kit and the Chip/nav-pill selection language —
`activeContainerColor: color('secondaryContainer')`,
`activeContentColor: color('onSecondaryContainer')`, `accent` border, M3 check.
**Full-width:** the row must span the content width (it does inside the `px-4`
container — confirm `Host matchContents` doesn't shrink it). Labels **600**.
Count badges: M3 segments have no badge slot — keep counts in the label
(`Label (N)`) **or** move to a `N VIDEOS` overline (see Open questions).

## ⚠️ TextInput / Textarea — M3 outlined, 2dp accent focus
**Current:** `z-text-input.tsx` fallback is `min-h-11 rounded-md border` (44dp,
generic border). The Android renderer is already `OutlinedTextField`.

**Adapt to:** the **Material 3 outlined** field — a full rounded border (12dp) on
a `surface` fill that turns **2dp `accent`** on focus (render as border + inset
ring so there is **no layout shift**); `invalid` → danger border; **56dp** min
height; pair with an external `<FieldLabel>` (no floating label needed for the
kit). `Textarea` is the same treatment, multi-line, `rows`-sized, no bottom-only
indicator. **iOS:** filled gray (systemGray6) rounded rect, no border, 10dp,
17px. Bump the contract-surface min-height from 44 → **56dp** to match.

## ⚠️ Snackbar (`z-toast`) — dark M3 bottom pill
**Current:** `ToastCard` is a **bordered light card** with an icon tile, title +
message and a dismiss "X", anchored top (`showToast(title, message, tone)` with
tones `success | error | info`).

**Adapt to (material):** the **M3 Snackbar** — a **dark inverse-surface pill**
(`on-surface` bg / `surface` text) anchored to the **bottom**, **4dp** radius,
one optional **accent action label** (not a dismiss X), a single line, auto-
dismiss. Keep the imperative `showToast` store/API. **iOS:** there is no native
bottom snackbar — render the closest idiom, a **light banner from the top**
(opaque surface card, soft shadow, leading status dot, optional tinted action).
The current card styling is the thing to replace, not the store.

## 🆕 Switch — wrap the native RN `Switch`
No `z-switch` exists. **Create `z-switch.tsx`** that renders React Native's
**native `Switch`** (so iOS gets a real `UISwitch`, Android the M3 Switch) and
themes it with role tokens: `trackColor={{ true: accent, false: surface-4 }}`,
`thumbColor` white, `ios_backgroundColor` neutral. Props:
`checked`, `onChange(checked)`, `disabled`, `accessibilityLabel`,
`platform`. Use as a `<ListItem trailing={…}>` in settings rows
(group preferences, notifications). Prefer the native control over a hand-rolled
track/thumb.

## 🆕 ListItem — a real `ZListItem`
Rows are currently composed ad hoc (`member-row`, `session-type-row`,
`schedule-day-row`, …). **Create `z-list-item.tsx`**: a `Pressable` row with
`leading` (IconTile / Avatar / icon) · `title` + optional `subtitle` ·
`trailing` (chevron / Badge / Switch), `onPress`, `selected`, `platform`.
- **material:** 15/700 title, 13px subtitle, tile radius, tonal selected fill,
  M3 state layer.
- **iOS:** grouped table cell — square corners (card clips), taller padding,
  **regular 17px** title, 15px secondary, systemGray pressed highlight.
Refactor the bespoke rows onto it where they fit.

## 🆕 Divider — `ZDivider`
**Create `z-divider.tsx`**: a thin `View` — **1dp** `outline` (material) /
**0.5dp** with a **16dp inset** (iOS table separator). Props: `vertical`,
`inset`, `platform`. Trivial but referenced everywhere rows stack on a card.

## 🆕 / ⚠️ Navigation headers — go native
The kit defines **`TopAppBar`** (M3 small top app bar), **`LargeTitleBar`** (iOS
large-title nav, default `ios`) and a bottom **`NavigationBar`**. In the app
these are currently the **expo-router native header / tab bar**. **Keep them
native — do not rebuild as `View`s:**
- **iOS large title:** `Stack.Screen options={{ headerLargeTitle: true, headerSearchBarOptions }}`
  — the system large-title bar + `.searchable` inset field. Trailing actions via
  `headerRight`. This is `LargeTitleBar`'s native form.
- **Android top app bar:** the M3 small top app bar (title left, action icons
  right, optional search). This is `TopAppBar`.
- **Bottom nav:** the native tab bar; on **Android** it should be the **M3
  `NavigationBar`** with the **64×32 pill indicator** behind the active icon
  (24dp icons, 80dp bar) and the **secondary-container** pill fill — matching the
  Chip/segment selection language. iOS = `UITabBar` (icon + label, accent tint,
  top hairline, home-indicator safe area).

Decision (per the Home redesign): when a screen uses an in-content greeting
header, set `headerShown:false` so there's no empty native bar above it — don't
show a header twice.

---

## Tokens — use the existing role tokens, never the prototype hexes
Map the prototype's roles to `src/theme/roles.ts` (light/dark), exposed to
NativeWind (`bg-accent`, `text-on-surface`, …) and native props
(`useRoleColors()` / `colors`).

| Role | Light | Dark | NativeWind / native |
|---|---|---|---|
| accent | `#bd4309` | `#ffb68f` | `bg-accent` · `color('accent')` |
| accentStrong (filled CTA) | `#bd4309` | `#bd4309` | `color('accentStrong')` |
| onAccent | `#ffffff` | `#ffffff` | `text-on-accent` |
| accent-container (hero, FAB-tonal, avatar) | `#ffdbc8` | `#7c3500` | `bg-accent-container` |
| on-accent-container | `#3a1400` | `#ffdbc8` | `text-on-accent-container` |
| **secondary-container** (selected seg/chip/nav pill, tonal btn) | `#ffdcc4` | `#5d4030` | `bg-secondary-container` |
| on-secondary-container | `#5a3214` | `#ffdcc4` | `text-on-secondary-container` |
| success / -container | `#15803d` / `#c7f1d2` | `#7fd99a` / `#1f4a30` | `ZBadge tone="success"` |
| warning / -container | `#b45309` / `#fef3c7` | `#fbbf24` / `#3b1500` | `ZBadge tone="warning"` |
| danger / -container | `#be123c` / `#ffe4e6` | `#fb7185` / `#500724` | `ZBadge tone="danger"` |
| background | `#fff8f4` | `#18120d` | `bg-bg` |
| surface (filled card tier) | `#fdf1ea` | `#1f160f` | `bg-surface` |
| surface-variant | `#faece2` | `#261c14` | `bg-surface-variant` |
| on-surface | `#221a15` | `#f2dfd2` | `text-on-surface` |
| on-surface-variant | `#54443b` | `#d8c3b6` | `text-on-surface-variant` |
| outline | `#d8c3b6` | `#54443b` | `border-outline` |

**Radii (dp):** field **12**, tile/row **16**, card **20**, hero/sheet **28**,
pill `full` (buttons, chips, avatars, nav pill), **FAB 16** (rounded square).
**Spacing:** 4dp base — gap 2/3/4 = 8/12/16; screen + card padding **16**.
**Type — Nunito Sans:** screen titles **700/800**; interactive labels (button,
nav, chip, segment, FAB, snackbar action) **600** (M3 medium); body/muted
**400/500**. Status colors only as small soft-container badges, never large
fills. Dark mode flips role tokens (warm espresso surfaces, never grey/black).

## Icons — `ZSymbol`, not lucide names
The prototype uses Lucide via CDN; in-app use **`ZSymbol name="…"`**
(`z-symbol.map.ts` → SF Symbols on iOS, Material Symbols on Android, Lucide on
web/test). Logical names: home→`home`, videos→`video`, sessions→`calendar`,
groups→`users`, profile→`person`, comment→`message`, add→`plus`, send→`send`,
join/call→`phone`/`video`, leave call→`phone-off`, invite→`qr-code`,
enhance→`sparkles`, check→`check`, status→`check-circle`/`clock`,
nav chevron→`chevron-right`. Outline only, ~1.75–2dp stroke, accent for
interactive / muted for secondary / danger for destructive. The OS status bar
(signal/wifi/battery) is **not** implemented.

## Copy / i18n
All text via **`react-i18next` `t(...)`** — the prototype hard-codes German;
add/keep keys in `src/i18n/locales/{de,en}.json`. Voice: plain, warm,
encouraging, second person, **sentence case** everywhere (never Title Case on
actions, ALL-CAPS only for tiny eyebrows). Short titles, one-sentence helpers.
Errors blame the system + offer the next step. **No emoji.** Numbers/time
tabular ("2:15", "30 min", "2h ago", "9+").

## State & data
No new global state. Reuse the existing query hooks already imported in each
screen (`useAssetsQuery`, `useMyBookingsQuery`, `useGroupsQuery`,
`useNotificationsQuery`, `useAuth` permissions, …) and the existing
loading (`ZSkeleton`/`RowSkeleton`) · error (`ZQueryError`) · empty
(`ZEmptyState`) branches. Don't render hero/progress modules until their queries
resolve (mirror the existing `isSuccess` gating).

---

## Screens in the kit (`design-references/index.html`)
The reference covers the full click-through: **Sign in → Home · Videos ·
Sessions · Groups · Profile** (bottom tabs), **Asset detail** (player +
timestamped review thread + composer), the full-bleed **live Call** screen
(mic/camera controls), and the **FAB** create actions (add video / book
session). Additional starting-point screens live in the design system's
`templates/` (call · detail · empty · form · list · onboarding, plus the iOS
`ios-videos` counterpart). Map them to the matching `app/**` routes; the
component deltas above apply uniformly across all of them.

## Open questions for the team
1. **`tonal` button rollout** — adding the variant is non-breaking, but should
   existing `secondary` (outlined) call-sites that are really "lower-emphasis
   primary" migrate to `tonal`? List them per screen.
2. **Segment counts** — keep `Label (N)` in the segment, or move to a single
   `N VIDEOS` overline above the list? (M3 segments have no badge slot.)
3. **`ZListItem` adoption** — refactor all bespoke rows onto it now, or only new
   rows + a follow-up migration?
4. **Snackbar migration** — replacing the bordered `ToastCard` with the dark M3
   pill changes every existing toast's look. Confirm the global swap (the API is
   unchanged).
5. **Header strategy** — confirm native large-title (iOS) + M3 top app bar
   (Android) everywhere, with `headerShown:false` only on screens that carry an
   in-content greeting header.

## Files in this bundle
- `design-references/index.html` — the full UI-kit prototype. Open it; use
  **Tweaks → Platform** (Material/iOS) and **Theme** (Hell/Dunkel).
- `design-references/screens*.jsx` — prototype screens (reference only).
- `design-references/data.js` — sample equestrian data.
- `design-references/UI-KIT-README.md` — the kit's own notes.
- The authoritative component contracts are the design system's `.d.ts` files
  (`components/<group>/*.d.ts`) and this README; the app's `z-*` files are what
  you edit to conform.
