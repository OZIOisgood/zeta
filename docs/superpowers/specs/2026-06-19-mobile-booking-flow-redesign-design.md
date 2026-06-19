# Mobile booking flow redesign (`/book`)

**Date:** 2026-06-19
**Area:** `mobile/` (Expo / React Native)
**Source of truth:** `mobile/handoffs/handoff_ui_kit/README.md` § "Session buchen — gestufter Flow statt Scroll-Accordion" + prototype `design-references/screens2.jsx` (`BookSession`).

## Context

The UI-kit handoff redesigned the coaching booking flow. The current
[`mobile/src/app/book.tsx`](../../../mobile/src/app/book.tsx) is a single scroll of
progressively-revealed cards under a **decorative** `ZStepper`, with experts as bare
text chips, a wrapping time-chip cloud, and the primary CTA buried at the bottom.

We throw that away and rebuild it as a **stepped flow**: one decision per step, a
**navigable** stepper, a date-rail + time-grid for slot picking, and a **persistent
summary bar** carrying the single CTA. Built only from `z-*` primitives (AGENTS.md),
reusing existing ones and adding new ones where it makes sense — native where a
platform widget fits, Custom-RN where it doesn't.

## Decisions (resolved with the user)

1. **First-available expert** ("Erste*r verfügbare*r") — **dropped for now.** It needs a
   group-wide slot query across all experts, which the API doesn't support without an
   `expertId`. Flow is Expert → Type → Time only.
2. **Empty days in the date rail** — **omitted entirely** (only days that have slots are
   rendered; this falls out naturally from the `slotsByDay` keys).
3. **Summary headline** — **duration fallback** (e.g. "30 min"). `SessionType` has no
   `price` field; no backend changes.
4. **Add-to-calendar** on success — **dropped.** Success shows the enriched summary card +
   "Fertig" only; no `expo-calendar` integration.
5. **Header** — header-left is plain **Cancel** (closes the sheet); step-back is via the
   navigable stepper (no prototype "smart-back" arrow).
6. **Section copy** — reuse existing `sessions.book.*` title keys for section headers;
   do not add the prototype's friendlier question copy ("Was möchtest du buchen?").

## Schema-reality gaps (prototype shows more than the API delivers)

Confirmed against `mobile/src/api/schema.d.ts`:

| Prototype | Schema today | Resolution |
|---|---|---|
| `SessionType.price` (`39 €`) | no `price` | summary headline = **duration** |
| `SessionType.icon` (`play-circle`…) | no `icon` | type rows use **one generic `ZIconTile` glyph** (e.g. `video`/`calendar`) |
| `CoachingExpert` rating/role/specialty | only `expert_id`, `first_name`, `last_name`, optional `avatar` (base64) | **drop** stars/role/specialty; avatar via `avatarSrc(expert.avatar)`, fallback `initialsFromName` |
| Type before Expert | `SessionType.expert_id` (types are per-expert) | keep order **Expert → Type**; adopt the *interaction*, not the inverted order |

## Target flow

`[Group → only if groups.length > 1] · 1 Expert → 2 Type → 3 Time → 4 Confirm → ✓`

- **Group** is a pre-step, **auto-skipped when `groups.length === 1`** (existing
  derived-state behavior). When >1 groups, it is stage 0 in the stepper.
- Order is **Expert → Type** (types are scoped to the expert via `expert_id`).
- The **stepper is tappable** to revisit any reached stage; the **summary bar** persists
  across all stages and carries the one CTA.

## Components

### Reuse unchanged
`ZListItem` (expert + type rows: `leading` avatar/icon-tile · `title` · `titleAccessory`
duration badge · `subtitle` · `selected` · `onPress`), `ZAvatar`, `ZIconTile`, `ZBadge`,
`ZTextarea` (`rows`), `ZScreen` (`edges={['bottom']}`), `ZButton`, `ZSymbol`, `ZDivider`,
and the four query states (`ZSkeleton` / `ZQueryError` / `ZEmptyState` / data — `isError`
checked before empty).

### Enhance — `ZStepper` (Custom-RN, single file)
Add an optional **`reached?: number`** prop (highest reached stage index). A step becomes
pressable when `reached != null ? index <= reached : step.state !== 'upcoming'`
(backward-compatible — existing call sites unaffected). Visual state still comes from
`step.state`. The screen tracks a `reached` value and passes `onStepPress`. Update
`z-stepper.stories.tsx` + `z-stepper.test.tsx` to cover the navigable path.

### New primitives
All **Custom-RN tier (b)** "no native equivalent" — identically-branded canvas on both
OSes, so each is a **single bare `.tsx`** + `.types.ts` + `.stories.tsx` + `.test.tsx`
(no `.ios`/`.android` split). Press via `Touchable`; role tokens only (no hex); native
iconography where glyphs appear. Each forwards `className`/`style`/`testID`.

- **`ZDateRail`** — horizontal `ScrollView` of day pills (`Heute`/weekday · day-number ·
  month). Props: `days: { key; label; day; month; isToday? }[]`, `selectedKey`,
  `onSelect(key)`, `testID`. Selected = `accentStrong`/`onAccent`, radius 16, pill ~54dp
  wide. Item `testID="book-daterail-<key>"`.
- **`ZTimeGrid`** — 3-column grid of start times for the selected day. Props:
  `slots: CoachingSlot[]`, `selectedStartsAt`, `onSelect(slot)`, optional `hint`, `testID`.
  Selecting passes the **whole `CoachingSlot`** (needs `ends_at`). Cell ≥ 44dp, radius 12,
  selected = `accentStrong` fill / unselected = `outline` inset. Duration hint rendered
  **once** below the grid, not per cell. Item `testID="book-time-<startsAt>"`.
- **`ZBookingBar`** — fixed footer, **sibling of the `ScrollView`** inside
  `ZScreen edges={['bottom']}` (no KAV — formSheet owns the keyboard). 1px `outline` top.
  Composition tier (native feel comes from its `ZButton` child). Props: `headline?`
  (duration), `hint?` (muted placeholder when nothing selected yet), `context?` (type ·
  expert · time), `ctaLabel`, `ctaDisabled`, `ctaLoading`, `onPress`, `testID="book-bar"`.

## Data & state

Coaching hooks unchanged: `useGroupsQuery`, `useCoachingExpertsQuery`,
`useSessionTypesQuery` (still filtered to `expert_id`), `useSlotsQuery`,
`useCreateBookingMutation`.

Screen state: `step` (current stage), `reached` (max stage), and selection
(`selectedGroupId`/`expertId`/`sessionTypeId`/`slot`/`notes`) with the **existing reset
cascade** (selecting an expert clears type+slot, etc.). `slotsByDay` (toDateString
grouping) feeds `ZDateRail`; the selected day's slots feed `ZTimeGrid`.

Stages are modeled as an ordered descriptor list built from state, so the group pre-step
is present only when `groups.length > 1`; bodies switch on stage **id**, not raw index.

Per-step CTA gate: stage is satisfiable when its selection exists (expert / type / slot);
confirm stage CTA = "Buchen". CTA `loading` while `isSubmitting`.

`handleSubmit` keeps the existing paths: success → enriched success state + `showToast`;
**409** → clear slot, invalidate slots query, inline "slot taken"; **400** → inline
"too late"; other → inline "failed".

## Success state

Enriched: a summary card (`ZAvatar` · type name · day/time · duration `ZBadge`) + **Fertig**
button → `router.replace('/coaching')`. `showToast` kept. `testID="book-success"`.

## i18n

Most copy exists under `sessions.book.*` + `common.actions.{next,done,back,bookSession}` +
`common.labels.{minutesShort,yourLocalTime}`. **One key missing:** a "Today" label for the
date rail. Add **`common.labels.today`** to the web JSON sources, then
`pnpm run sync:i18n`, then **re-add mobile-only keys by hand** (sync is destructive —
e.g. `sessions.call.sessionFallback`). No invented keys; no inline literals.

## Testing

- Rewrite [`src/__tests__/book-flow.test.tsx`](../../../mobile/src/__tests__/book-flow.test.tsx)
  for the stepped flow (TDD): drive Expert → Type → date-rail → time-grid → confirm →
  submit → success; assert the four query states; assert the bar CTA gating and the
  navigable stepper. Continue `book-stepper` / `book-expert-*` / `book-type-*` /
  `book-submit` / `book-success`; add `book-daterail-*` / `book-time-*` / `book-bar`.
  (`book-slot-*` is retired — replaced by date-rail + time-grid.)
- New primitives get jest tests (render + selection + disabled) and Storybook stories
  against the bare `.tsx`.
- Green gate: `make mobile:lint` + `make mobile:typecheck` + `make mobile:test`
  (re-confirm the jest summary if `make` reports a worker-teardown flake).
- Sign-off: **iOS + Android dev-build screenshots** of the redesigned flow in the PR
  (handoff visual-fidelity rule — green gates ≠ done).

## Files

**New:** `z-date-rail.{types.ts,tsx,stories.tsx,test.tsx}`, `z-time-grid.{…}`,
`z-booking-bar.{…}` under `mobile/src/components/ui/`.
**Modified:** `z-stepper.tsx` (+ stories + test); `mobile/src/app/book.tsx` (full rewrite);
`mobile/src/__tests__/book-flow.test.tsx` (rewrite); web i18n JSON sources + synced
`mobile/src/i18n/locales/{en,de,fr}.json` (one new `common.labels.today`).

## Out of scope / follow-ups

- Backend `price`/`currency` on `SessionType` and rating/specialty on `CoachingExpert`
  (would restore the prototype's richer summary + expert rows).
- Group-wide availability query → enables "first-available" expert.
- Add-to-calendar (`expo-calendar`) on the success screen.
