# Handoff: Home & Videos — Material You (Android) Redesign

## Overview
A visual + structural redesign of the **Home** and **Videos** tab screens for the
Strido mobile app (Expo / React Native), targeting a modern, native **Android
Material 3 / Material You** look and feel. The chosen colour direction is the
**brand ember-orange** scheme (the same warm palette already in `theme/roles.ts`),
in both **light** and **dark** mode.

This handoff is written against the **actual codebase** in `mobile/`. The most
important thing to know up front: **most of the Material-3 mechanics already
exist** in your app (segmented filters, native nav bar, FAB-on-Android, the
`Z*` component library, light/dark role tokens). This is therefore a list of
**targeted deltas to apply to the two existing screens** — not a rebuild and not
a new design system.

---

## About the Design Files
The files in `design-references/` are **design references created in HTML/React
(for the browser)** — prototypes that show the intended look, layout, and
behaviour. They are **not** production code to copy. They deliberately re-derive
a Material tonal palette and re-implement primitives in inline styles so they can
run standalone in a browser.

**Do not port the HTML/JSX or its hex values.** The task is to **recreate the
intended design in the existing React Native codebase**, using its established
components (`src/components/ui/Z*`, `src/components/*`), its role tokens
(`src/theme/roles.ts`, `src/theme/colors.ts`, `useRoleColors()`), its icon
system (`ZSymbol`), its i18n (`react-i18next`), and its data hooks
(`useAssetsQuery`, `useMyBookingsQuery`, etc.).

## Fidelity
**High-fidelity.** Colours, type weights, spacing, radii, and component choices
are deliberate. Recreate them precisely — but source every value from the
existing tokens listed below, not from the prototype's hexes.

---

## Source files you will edit
| Screen | File |
|---|---|
| Home | `src/app/(tabs)/(home)/index.tsx` |
| Videos | `src/app/(tabs)/videos/index.tsx` |
| Video card | `src/components/asset-card.tsx` |
| Onboarding row | `src/components/first-step-row.tsx` |
| (new) Next-session hero | `src/components/next-session-card.tsx` *(new file)* |
| (new) First-steps wrapper | `src/components/first-steps-card.tsx` *(new file, optional)* |

Reference prototypes (in this bundle): `design-references/index.html` (Home),
`design-references/videos.html` (Videos).

---

# HOME SCREEN

## Purpose
Personalised landing for an active user: orient them, surface the next live
session, show recent videos, and keep onboarding progress visible.

## What changes vs. the current `(home)/index.tsx`
The current Home is: a **row of three `StatCard`s** → **"Latest videos" `ZCard`**
→ **"First steps" `ZCard`**. The redesign restructures the page into four
modules and drops the stat-card row:

1. **Personalised greeting header** *(new)* — time-of-day greeting + first name,
   avatar on the left, notification bell on the right.
2. **"Nächste Session" hero card** *(new)* — the single most imminent upcoming
   booking, rendered as a filled **accent-container** card with a primary
   **Beitreten/Join** button.
3. **"Deine Videos"** — the existing latest-videos list (`AssetCard` ×4) with a
   section header + "Alle ansehen / View all" link. (Same as today, minus the
   `ZCard` wrapper — see layout.)
4. **"Erste Schritte" progress card** — the existing `FirstStepRow` list, now
   wrapped with a **progress bar + "n/total" counter** in the card header.

> The **three `StatCard`s are removed** in this direction. If you want to keep
> them, they belong below the hero — but the redesign intentionally favours the
> hero + recent activity over raw counts (less "data slop").

### Module 1 — Greeting header
- Layout: `flex-row items-center`, 12px gap, padding `8px 16px 14px`.
- **Avatar** (left): 44×44 circle, `accentContainer` background,
  `onAccentContainer` text, user initials, 16px/800. Use `ZAvatar` if it
  supports an initials fallback; otherwise a `View` + `Text`.
- **Text block** (center, flex-1): line 1 = greeting (`13px/600`,
  `onSurfaceVariant`) e.g. *"Guten Morgen"*; line 2 = first name (`22px/800`,
  `-0.02em`, `onSurface`), `numberOfLines={1}`.
- **Bell** (right): **keep your existing `NotificationBell`**. ⚠️ Decision
  point — see "Open questions" — currently the bell is mounted in the **native
  header** via `navigation.setOptions({ headerRight })`. The prototype draws it
  *in content*. Pick one; do not show it twice. Recommendation: if you adopt the
  in-content greeting header, **remove the native header** for Home
  (`headerShown: false`) and place `NotificationBell` in this row, so the
  greeting isn't stacked under an empty native bar.

### Module 2 — "Nächste Session" hero  *(new component: `NextSessionCard`)*
- Data: first upcoming booking from `useMyBookingsQuery()` — i.e.
  `status !== 'cancelled' && scheduled_at > now`, earliest first. If none, render
  nothing (or a slim "Session buchen" prompt — your call).
- Surface: filled card, `accentContainer` bg, `onAccentContainer` fg,
  radius **28**, padding 18.
- Contents:
  - Eyebrow row: `calendar` ZSymbol + *"NÄCHSTE SESSION"* (`11px/800`, uppercase,
    `.08em`), and a pill on the right with relative time (e.g. *"in 2 Tagen"*) on
    a `surface` chip.
  - Title (`19px/800`): session type + counterpart, e.g.
    *"Video-Review mit {expert}"* (reuse BookingCard's counterpart logic).
  - Meta row: `clock` ZSymbol + `{date} · {duration} min`.
  - Actions: **primary `ZButton` "Beitreten/Join"** (full-ish width, icon
    `phone` or `video`) using `t('common.actions.join')`, plus a secondary
    outline **"Details"** button.
- This is effectively a **prominent variant of `BookingCard`**. Easiest path:
  add a `variant="hero"` to `BookingCard`, or compose a new `NextSessionCard`
  that reuses its label/counterpart helpers.

### Module 3 — "Deine Videos"
- Section header row: title *"Deine Videos"* (`17px/800`, `onSurface`,
  `numberOfLines={1}`) + right-aligned **"Alle ansehen"** link
  (`ZButton variant="link"`, `t('common.actions.viewAll')` → `router.push('/videos')`).
- List: the existing `latestVideos.map(... <AssetCard/>)`, gap 10–12. Keep the
  existing loading (`RowSkeleton`), error (`ZQueryError`), and empty
  (`ZEmptyState`) states from the current file.
- The redesign uses a slightly richer tile (see Videos card spec) — apply the
  same `AssetCard` styling here for consistency.

### Module 4 — "Erste Schritte" progress card
- Wrap the existing `steps.map(... <FirstStepRow/>)` in a card whose header adds:
  - Title *"Erste Schritte"* (`t('home.firstSteps.title')`, `16px/800`).
  - A **counter** on the right: `{completedCount}/{steps.length}` (`13px/700`,
    `onSurfaceVariant`).
  - A **progress bar** under the header: 6px track, `outlineVariant` bg,
    `accent` fill at `completed/total` width, radius 999.
- Keep the existing permission-gating and `showFirstSteps` logic exactly.
- `FirstStepRow` is reused unchanged (completed rows already dim to `opacity-60`).

## Home layout container
Keep the existing `ZScreen` + `ScrollView` with
`contentInsetAdjustmentBehavior="automatic"` and the Android tab-bar bottom
padding (`insets.bottom + ANDROID_TAB_BAR_HEIGHT`). Module gap ≈ 22.
Greeting sits **outside** the scroll (sticky-feeling) or as the first scroll
child — either is fine; prototype has it outside.

---

# VIDEOS SCREEN

## Purpose
Browse all of the user's videos, filter by review state, and upload a new one.

## What changes vs. the current `videos/index.tsx`
Good news: the current screen is **already 90% of the redesign**. It already has
a `ZTabs` filter (which on Android is a Material 3 segmented button row), a
`FlatList` of `AssetCard`s, the Android FAB / iOS header-button create action,
and full loading/error/empty states. The deltas are small:

1. **Filter = full-width segmented button.** ✅ Already done — `ZTabs` on Android
   renders `SingleChoiceSegmentedButtonRow` (`z-tabs.android.tsx`). Heinrich's
   "should these be full width?" → **yes, and they already are.** No work beyond
   making sure the row spans the content width (it does inside the `px-4` View).
   The prototype's three segments map 1:1 to the existing
   `all / toReview / reviewed` tabs.
2. **No search field.** The prototype removed the search bar — the current code
   has none, so **nothing to add**. (If a search row was on a backlog, keep it
   off for now per review feedback.)
3. **No group-initials badge on cards.** The current `AssetCard` already shows
   the group as a single secondary text line (`secondaryLine`), **not** an
   initials chip — so this matches. Do **not** add initials chips.
4. **Optional count label.** The prototype shows a small *"4 VIDEOS"* overline
   above the list (`12.5px/700`, uppercase, `onSurfaceVariant`). Add it as a
   `ListHeaderComponent` sibling if desired; purely additive.
5. **Card styling refresh** — see below; apply to `asset-card.tsx` so Home and
   Videos share it.

### Video card  (`asset-card.tsx`)
Current card is a `flex-row` row with a 64×96 thumbnail, title, secondary line,
a `ZBadge` status, and a comment count. Redesign refinements (all styling-only):
- Container radius **20–22**, padding 12, background `surface` (`s1` tier).
- Thumbnail **104×70**, radius 16, with a circular translucent **play overlay**
  and a duration pill bottom-right (`{duration}`, `10px/700`, white on black 60%).
  For `waiting_upload`, swap the play glyph for an `file-video`/upload glyph and
  hide the duration.
- Title `15px/700`, `numberOfLines={1}`.
- Secondary line = group name (`12.5px`, `onSurfaceVariant`).
- Status row: keep the existing `ZBadge` (tones already correct:
  `waiting_upload→neutral`, `pending→primary`, `completed→success`). The
  prototype adds a small status icon inside the chip (`check-circle` / `clock` /
  upload) — optional; the `ZBadge` tone already communicates state.
- Comment count: keep the existing `message`-icon + count.

### Videos layout
Keep `ZScreen` + the filter `View` (`px-4`) + the `FlatList`. The FAB block and
the iOS header-button `useEffect` stay **exactly as-is** — they are the correct
SOTA-per-platform create action and already match the prototype's "Hochladen"
FAB.

---

## Interactions & Behavior
- **Navigation**: all via `expo-router` `router.push(...)` — unchanged.
  - Greeting bell → `/notifications`; hero "Beitreten" → join flow / `router.push`
    to the booking; "Alle ansehen" → `/videos`; `AssetCard` → `/asset/{id}`;
    FAB / header "+" → `/upload`; first-step rows → their existing `onPress`.
- **States**: reuse the existing `isPending` (skeleton), `isError`
  (`ZQueryError`), and empty (`ZEmptyState`) branches in both screens. The hero
  and progress card should not render until their queries resolve (mirror the
  existing `loaded = groups.isSuccess && assets.isSuccess` gating).
- **Press feedback**: existing components already use `active:bg-z-surface-warm`
  and `Touchable`/haptics — keep.
- **Reduced motion / no new animations** required.

## State Management
No new global state. Data comes from the existing hooks already imported in the
two screens:
- `useAssetsQuery()` — videos (Home preview slice + Videos list).
- `useMyBookingsQuery()` — upcoming sessions (hero + upcoming count).
- `useGroupsQuery()`, `useMyAvailabilityQuery()` — first-steps gating.
- `useNotificationsQuery()` — bell unread count.
- `useAuth()` permissions — gate stat/step/create actions (unchanged).
Local: Videos `activeFilter` state already exists. Add a derived
`completedCount/steps.length` for the progress bar (no new store).

---

## Design Tokens — use the EXISTING tokens, not the prototype's hexes
The prototype derived its own `--m-*` palette for the browser. **Map it to your
existing role tokens** (`src/theme/roles.ts`, exposed to NativeWind as
`bg-accent`, `text-on-surface`, … and to native props via `useRoleColors()` /
`colors`). Mapping:

| Prototype role | Your token (light / dark via `roles`) | NativeWind / native |
|---|---|---|
| primary / accent | `accent` `#ea580c` / `#fb923c` | `bg-accent`, `colors.primary` |
| on-primary | `onAccent` `#ffffff` | `text-on-accent`, `colors.onPrimary` |
| primary-container (hero bg, avatar, FAB) | `accentContainer` `#fed7aa` / `#7c2d0a` | `bg-accent-container` |
| on-primary-container | `onAccentContainer` `#c2410c` / `#fed7aa` | `text-on-accent-container` |
| success-container (Geprüft chip) | `successContainer` / `onSuccessContainer` | via `ZBadge tone="success"` |
| secondary-container (selected segment, In-Prüfung chip) | `accentContainer` (selected seg) · `ZBadge tone="primary"` (chip) | — |
| bg | `background` `#fff8ed` / `#1a0f08` | `bg-bg` (`z-bg`) |
| surface / s1–s4 tiers | `surface` / `surfaceVariant` | `bg-surface`, `bg-surface-variant` |
| on-surface | `onSurface` `#26180f` / `#f5e6d3` | `text-on-surface` (`text-z-text`) |
| on-surface-variant | `onSurfaceVariant` `#735f4d` / `#a8917c` | `text-on-surface-variant` (`text-z-muted`) |
| outline | `outline` `#ead2b8` / `#4a3020` | `border-outline` (`border-z-border`) |
| outline-variant (progress track) | `outline` (or a lower-emphasis tint) | `bg-z-border` |

Spacing: keep the app's Tailwind scale (gap 2/3/4 = 8/12/16). Radii used:
cards 20–22, hero 28, pills/badges 999, progress 999. Type weights: 800 for
headers/titles, 700 for labels, 600 for muted captions — Nunito Sans (already
the app font).

## Icons — use `ZSymbol`, not lucide names from the prototype
The prototype uses lucide names directly; in-app, use **`ZSymbol name="…"`**
(`z-symbol.map.ts`). Name mapping for the glyphs used:

| Prototype (lucide) | `ZSymbol` name |
|---|---|
| `house` | `home` |
| `video` | `video` |
| `calendar-clock` | `calendar` |
| `users` | `users` |
| `user-round` | `person` |
| `bell` | `bell` |
| `clock` | `clock` |
| `check` | `check` |
| `check-circle-2` | `check-circle` |
| `chevron-right` | `chevron-right` |
| `message-circle` | `message` |
| `upload` / `upload-cloud` | `file-video` (or `plus` for the create action) |
| `play` | *no app glyph* — keep a drawn play triangle inside the thumbnail (as today) |
| `search`, `sliders-horizontal` | *removed* (search bar dropped) |
| `signal` / `wifi` / `battery-full` | n/a — OS status bar, do not implement |

## Copy / i18n
All text must go through `react-i18next` `t(...)`. The prototype hard-codes
German strings; add/keep keys instead. Existing keys to reuse:
`home.firstSteps.title`, `home.latestVideos`, `common.actions.viewAll`,
`common.actions.join`, `videos.all`, `videos.reviewStatus.toReview`,
`videos.reviewStatus.reviewed`, `common.status.inReview`,
`common.status.reviewed`, `upload.uploading`, `upload.title`.
New keys needed: a greeting (`home.greeting.morning/afternoon/evening`), the
hero eyebrow (`home.nextSession.title`), and a relative-time helper for the hero
pill. Mirror the existing `de`/`en` locale file structure.

## Assets
No new image assets. Thumbnails come from `asset.thumbnail` via `ZVideoPreview`.
Avatar is initials-based (no upload needed for the greeting). Icons are system
symbols via `ZSymbol`.

---

## Open questions for the team
1. **Bell placement** — native header (current) vs. in-content greeting row
   (prototype). Recommend in-content + `headerShown:false` on Home so there's no
   empty native bar above the greeting. Confirm.
2. **Stat cards** — the redesign drops the 3 `StatCard`s. OK to remove, or keep
   a slimmer version below the hero?
3. **Hero when no upcoming session** — render nothing, or a "Session buchen"
   prompt card?
4. **Segmented count** — the native `SingleChoiceSegmentedButtonRow` has no badge
   slot, so counts currently append as "Label (N)". The prototype dropped the
   per-segment counts and shows a total "N VIDEOS" overline instead. Keep counts
   in the segment labels, or move to the overline?

## Files in this bundle
- `design-references/index.html` — Home prototype (4 colour/theme variants;
  the **orange light/dark** ones are the chosen direction).
- `design-references/videos.html` — Videos prototype (orange light + dark).
- `design-references/material-home.jsx` — Home prototype components.
- `design-references/videos-home.jsx` — Videos prototype components.
- `design-references/material-themes.js` — the prototype's derived palette
  (reference only — map to `roles.ts` as per the token table above).
- `design-references/data.js` — sample data used by the prototypes.

Open the two HTML files in a browser to see the intended result.
