# Design: Home & Videos — Material/HIG Redesign (from `design_handoff_home_videos`)

- **Date:** 2026-06-15
- **Branch:** feat/mobile-token-auth
- **Source handoff:** `mobile/handoffs/design_handoff_home_videos/`
- **Scope:** Restructure the **Home** and **Videos** tab screens to the handoff
  direction. Platform-adaptive: take the handoff's Material 3 treatment for
  Android; for anything not natively iOS, use the HIG-native equivalent. Where
  the handoff itself makes a cross-platform recommendation (greeting header), follow it.

## Context

The handoff is a **targeted delta** to two existing screens, not a rebuild. Most
Material mechanics already exist (segmented `ZTabs`, native nav bar, Android FAB,
the `Z*` library, light/dark role tokens). Verified up front:

- **Tokens already match.** `src/theme/roles.ts` carries the exact ember-orange
  palette the handoff specifies (`accent #ea580c`, `accentContainer #fed7aa`,
  `background #fff8ed`, dark variants). **No token changes.**
- **Icons exist.** Every `ZSymbol` needed is in `z-symbol.map.ts` (`calendar`,
  `clock`, `video`, `message`, `bell`, `check`, `check-circle`, `chevron-right`,
  `file-video`, `plus`).
- **Data.** `Me` provides `first_name`/`last_name`/`id`/`avatar` (greeting +
  hero counterpart). **`Asset` has NO `duration` field** and list responses omit
  `videos`/`group` → the handoff's duration pill is **not implementable**; drop it.
- `ZButton` already has `secondary` (outline) + `link` variants. `ZAvatar`
  supports initials but with surface-warm coloring (needs an accent tone).
- `StatCard` is also used by Coaching + Reports → **keep the component**, only
  remove its usage from Home.
- No relative-time helper exists (`formatBookingDateTime` is absolute only) →
  add a locale-aware `Intl.RelativeTimeFormat` helper for the hero pill.

## Decisions (confirmed with user)

1. **Platform scope:** platform-adaptive — Android = handoff Material; iOS = HIG
   equivalent for non-native pieces. Stick to the handoff where it recommends.
2. **Home header:** in-content greeting row on **both** platforms
   (`headerShown:false`), per handoff. (One place where the handoff's
   cross-platform recommendation wins over a pure-iOS large-title nav bar.)
3. **Stat cards:** removed from Home.
4. **Empty hero:** show a slim "Session buchen" prompt (gated on `coaching:book`),
   else render nothing.
5. **Videos segment counts:** drop per-segment counts; add a `"{n} VIDEOS"`
   overline (handoff prototype direction).

## Approach

Shared Custom-RN content components that lean on already-native sub-primitives
(`ZButton` = SwiftUI/Compose button, `ZSymbol` = SF/Material symbols, `ZCard` =
Material Card on Android / role-token inset card on iOS). These adapt via role
tokens and need **no** `.ios`/`.android` split. Platform divergence is handled by
the primitives the handoff already specifies per-platform (FAB vs nav "+",
segmented control, Card). Rejected: full per-platform screen variants
(duplication) and a single hard-coded shared layout (user ruled out).

### Native components, NOT hand-rolled (explicit constraint)

Per `mobile/AGENTS.md` ("Build new UI only from `z-*` primitives"; "prefer the
native presentation primitive over hand-rolled RN") and direct user instruction.
Every UI element maps to a `z-*` primitive — no inline `View`-as-control. Where a
needed primitive is missing, it is **created as a primitive** (with bare `.tsx`
fallback + tests), never hand-rolled in the screen.

| Element | Native component (no hand-roll) |
|---|---|
| Hero container (tonal filled card) | **Brand-led `View`** (Custom-RN tier a): `rounded-[28px] bg-accent-container p-[18px]`. NOT `ZCard` — the native Compose `Card` has no corner-radius prop, so it can't hit the handoff's radius 28. Children are all native primitives. |
| Hero "Beitreten" / "Details" | `ZButton` (`primary` / `secondary` outline) — SwiftUI/Compose buttons |
| Hero relative-time pill ("in 2 Tagen") | `ZBadge` (`tone='neutral'`) — static pill primitive. (NOT `ZChip`: that is an interactive Material FilterChip — wrong semantics.) |
| Eyebrow / meta icons | `ZSymbol` (`calendar`, `clock`) |
| **Progress bar** (Erste Schritte) | **New `ZProgress` primitive — Native tier.** Android = Material 3 `LinearProgressIndicator` (`@expo/ui/jetpack-compose`, `progress`/`color`/`trackColor`, full width via `fillMaxWidth()`); iOS = SwiftUI `ProgressView` (`@expo/ui/swift-ui`, `value`); bare `.tsx` = track+fill fallback for web/jest. **Verified present in `@expo/ui` 56.0.17.** |
| **Create FAB** (Videos, Android) | **New `ZFab` primitive — Native tier.** Android = Material 3 `ExtendedFloatingActionButton` (`.Icon` + `.Text` slots, `containerColor`, `expanded`); iOS = renders `null` (create action stays the nav-bar "+"). Replaces the current round `ZIconButton` FAB. |
| First-steps / progress containers | `ZCard` (native Section/Card) |
| Greeting avatar | `ZAvatar` (+ new `accent` tone) |
| Notification bell | existing `NotificationBell` (already `ZSymbol`/`Touchable`) |
| Video thumbnail play glyph | **New `play` entry in `z-symbol.map.ts`** (`play.fill` / `play_arrow` / lucide `Play`) → `ZSymbol`, instead of a hand-drawn triangle (more native than the prototype) |
| Card press target | `Touchable` (not raw `Pressable`) |
| Segmented filter | `ZTabs` (native segmented) |

## Home — modules (replaces current StatCards → Latest `ZCard` → First-steps `ZCard`)

1. **Greeting header** *(new, in-content, `headerShown:false`)* — `flex-row`,
   44px avatar (accent-container, initials fallback or real `Me.avatar`), text
   block (greeting `13/600 onSurfaceVariant` + first name `22/800 onSurface`),
   `NotificationBell` on the right. Replaces the current
   `navigation.setOptions({ headerRight: bell })` effect.
2. **"Nächste Session" hero** *(new `src/components/next-session-card.tsx`)* —
   **brand-led tonal `View`** (`rounded-[28px] bg-accent-container p-[18px]`,
   handoff radius 28 / padding 18): eyebrow (`ZSymbol calendar` + "NÄCHSTE
   SESSION" 11px/800 + **`ZBadge`** relative-time pill), combined title
   `Video-Review mit {counterpart}` (19px/800, via `home.nextSession.titleWith`),
   meta (`ZSymbol clock` + date · duration), primary **`ZButton`** "Beitreten" +
   secondary outline `ZButton` "Details". Data = earliest non-cancelled future
   booking from `useMyBookingsQuery`. Empty → "Session buchen" prompt (gated
   `coaching:book`) else nothing. Reuses BookingCard's counterpart logic
   (extracted to a shared helper).
3. **"Deine Videos"** — section header (title + "Alle ansehen" `ZButton
   variant="link"` → `/videos`) over existing `latestVideos.map(<AssetCard/>)`.
   Drop the `ZCard` wrapper. Keep existing skeleton / `ZQueryError` /
   `ZEmptyState` branches verbatim.
4. **"Erste Schritte"** — wrap existing `steps.map(<FirstStepRow/>)` in a `ZCard`
   whose header adds a `{done}/{total}` counter + a **`ZProgress`** bar (new
   primitive; accent fill on `outline` track). Keep all permission-gating /
   `showFirstSteps` logic. `FirstStepRow` reused unchanged.

Keep `ZScreen` + `ScrollView` + Android tab-bar bottom padding. Module gap ≈ 22.

## Videos — deltas (screen is already ~90% there)

- **Filter:** keep `ZTabs` (native segmented), full-width. **Drop `count` props**;
  add `"{n} VIDEOS"` uppercase overline as `FlatList` `ListHeaderComponent`.
- **`asset-card.tsx` refresh** (shared by Home + Videos): container radius ~20,
  padding 12, `surface` bg; 104×70 thumbnail (radius 16) with a circular play
  overlay drawn with **`ZSymbol name="play"`** (new map entry; waiting_upload →
  `file-video` glyph instead); status `ZBadge` kept; comment count `MessageSquare`
  (raw lucide) → `ZSymbol name="message"`; raw `Pressable` → `Touchable`
  (haptics). **No duration pill** (no data).
- **Create FAB → extended FAB.** Android: replace the round `ZIconButton` FAB
  with the new `ZFab` (Material 3 `ExtendedFloatingActionButton`, icon + label
  e.g. "Upload video"). iOS: unchanged nav-bar "+". This intentionally upgrades
  the handoff-README's "keep FAB as-is" to the prototype's labeled "Hochladen"
  extended FAB (M3 standard). All four query states unchanged.

## Components & helpers touched

| File | Change |
|---|---|
| `src/app/(tabs)/(home)/index.tsx` | Rebuild to 4 modules; drop StatCards + native headerRight; `headerShown:false` |
| `src/app/(tabs)/videos/index.tsx` | Drop segment counts; add overline header; swap round FAB → `ZFab` (extended) |
| `src/components/asset-card.tsx` | Restyle; `Touchable` + `ZSymbol`; play overlay via `ZSymbol play` |
| `src/components/next-session-card.tsx` | **New** hero + empty-prompt (brand-led tonal `View` composing `ZButton`/`ZBadge`/`ZSymbol`) |
| `src/components/booking-card.tsx` | Extract counterpart helper for reuse |
| `src/components/ui/z-progress.{types,tsx,ios,android}.tsx` | **New** Native-tier primitive: Android `LinearProgressIndicator`, iOS `ProgressView`, bare track+fill fallback + test |
| `src/components/ui/z-fab.{types,tsx,ios,android}.tsx` | **New** Native-tier primitive: Android `ExtendedFloatingActionButton`, iOS null + test |
| `src/components/ui/z-avatar.tsx` | Add `accent` tone for greeting initials (16px/800) |
| `src/components/ui/z-symbol.map.ts` | Add `play` entry (`play.fill` / `play_arrow` / `Play`) |
| `src/api/queries/coaching.ts` (or util) | **New** `formatRelativeTime` (`Intl.RelativeTimeFormat`) |
| i18n `en/de/fr` | New keys (see below) |

## i18n

New keys: `home.greeting.{morning,afternoon,evening}`, `home.nextSession.title`
(eyebrow), hero CTA / "Session buchen" prompt copy, videos `"{n} VIDEOS"` overline.
Add to web `en/de/fr` sources → `pnpm run sync:i18n` → **re-add mobile-only keys**
(sync is destructive). Reuse existing `common.actions.join`/`viewAll`,
`home.firstSteps.title`, `videos.*`, `common.status.*`.

## Testing / verification

- Update `src/__tests__/home-screen.test.tsx` (StatCards gone; new modules present).
- Add tests: `NextSessionCard` (data + empty-prompt branches), `formatRelativeTime`,
  restyled `AssetCard`, new `ZProgress` + `ZFab` primitives.
- `native-classname-forwarding.test.ts` must stay green after the new `ZProgress`
  / `ZFab` primitives (their `.ios.tsx`/`.android.tsx` must reference `className`).
- Green gate: `make mobile:lint` + `make mobile:typecheck` + `make mobile:test`.
- Device screenshots (iOS + Android) of Home + Videos for the PR.

## Follow-ups / out of scope

- Duration pill deferred until the list API exposes a duration field.
- No search field (handoff dropped it; none exists today).
- Real "Join" deep-link wiring reuses the existing booking join flow.
- `upload-progress-card.tsx` should migrate its inline bar to the new `ZProgress`
  primitive (reuse) — out of scope for this change, noted for a follow-up.
- Videos create FAB upgraded to a Material 3 **extended** FAB (`ZFab`) — a
  deliberate upgrade over the handoff-README's "keep as-is" wording, matching the
  prototype's labeled FAB and M3 guidance.
