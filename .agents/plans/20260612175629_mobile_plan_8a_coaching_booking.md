# Mobile Plan 8a: Coaching Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Coaching tab lists the user's bookings (upcoming/past, with status and a link to the session recording's asset when one exists) and lets users with `coaching:book` book a session through a guided flow: group → expert → session type → free slot → confirm (optional notes). Upcoming bookings can be cancelled (two-step confirm; notice rules enforced server-side).

**Scope split:** This is the BOOKING half of the coaching package — pure JS, Expo Go stays sufficient. Plan 8b (Agora live calls via `/connect`, `react-native-agora`, expo-dev-client + EAS) is deliberately separate and needs user involvement. The Join-call affordance is OUT of 8a (the connect window UI arrives with 8b); recording links into the existing `/asset/[id]` screen ARE in.

**Architecture:** Contract grows by six coaching operations. Hooks follow `src/api/queries/` conventions (new `coaching.ts`). New screens: real `(tabs)/coaching.tsx` (bookings list) and `/book` (the guided flow, modal, in the signed-in guard). Slot picking groups the server-computed slots by day. Design rules in `mobile/AGENTS.md` are BINDING.

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
**Predecessors:** Plans 1–7 on `feat/mobile-token-auth` (PR #15 — single-PR strategy).
**Conventions:** identical to Plans 2–7 (wsl.exe wrapper, UNC paths, RNTL 14 async render, tests never under `src/app/`, per-task gates, Conventional Commits, no `Co-Authored-By`).

---

## Backend source of truth (verified; RE-READ the handlers for exact codes/params)

`internal/coaching/handler.go:79-143` (RegisterRoutes):
- `GET /coaching/bookings` — cross-group, perm `coaching:bookings:read` (verify the exact slug in `internal/permissions/permissions.go`) → `[]bookingResponse`.
- Under `/groups/{groupID}/coaching` (group membership enforced):
  - `GET /session-types` (membership only) → `[]sessionTypeResponse` `{id, expert_id, group_id, name, description, duration_minutes, is_active, created_at}`.
  - `GET /experts` + `GET /slots` — perm `coaching:slots:read`. Slots REQUIRE query params `expert_id` + `session_type_id` (400 otherwise — check for additional optional params like a date window in `slots.go`); slot: `{expert_id, starts_at, ends_at, duration_minutes}`. Expert: `{expert_id, first_name, last_name, avatar?}`.
  - `POST /bookings` — perm `coaching:book`; body `{expert_id, session_type_id, scheduled_at (RFC3339), notes?}`; read `CreateBooking` for the success status + validation errors (min booking notice → which code?).
  - `GET /bookings` — perm `coaching:bookings:read` → my bookings in this group.
  - `PUT /bookings/{bookingID}/cancel` — fine-grained auth INSIDE the handler (read it: participant check, cancellation notice rule, status codes); body `{cancellation_reason?}`.
- `bookingResponse`: `{id, expert_id, expert_name, student_id, student_name, group_id, session_type_id, session_type_name?, scheduled_at, duration_minutes, status ("pending"|"done"|"cancelled"), cancellation_reason?, cancelled_by?, notes?, recording? {status, asset_id?, video_id?}, created_at}`.

## File Structure (end state)

```
docs/openapi.yaml + regenerated schema      six coaching operations + Booking/SessionType/Slot/CoachingExpert schemas
mobile/src/api/queries/coaching.ts          useMyBookingsQuery, useSessionTypesQuery, useCoachingExpertsQuery,
                                              useSlotsQuery, useCreateBookingMutation, useCancelBookingMutation (+tests)
mobile/src/components/booking-card.tsx      booking row: when/who/type/status chip, cancel, recording link (+test)
mobile/src/app/(tabs)/coaching.tsx          bookings list (upcoming/past) + Book entry
mobile/src/app/book.tsx                     guided booking flow (modal route in signed-in guard)
mobile/src/__tests__/coaching-list.test.tsx, book-flow.test.tsx
```

---

### Task 1: Contract — coaching operations

- [ ] READ `bookings.go` (CreateBooking success code + notice-violation code, CancelBooking auth/codes), `slots.go` (ALL query params), `session_types.go`, `experts.go`, and the permission slugs in `permissions.go`. Add operations `listMyBookings` (`GET /coaching/bookings`), `listGroupSessionTypes`, `listCoachingExperts`, `listAvailableSlots` (query params per handler, required ones marked), `createBooking`, `cancelBooking` — plus schemas `Booking` (with nested `BookingRecording`), `SessionType`, `CoachingSlot`, `CoachingExpert`, `CreateBookingRequest`, `CancelBookingRequest`. Status enums per the Go constants. Document the spec to MATCH the handlers.
- [ ] Lint (0 errors, warnings unchanged) → regenerate → mobile suite stays green (133) → commit `feat(api): add coaching booking endpoints to the contract`.

### Task 2: Hooks (TDD)

- [ ] `src/api/queries/coaching.ts` mirroring established conventions (injectable Fetcher/Poster/Invalidator):
  - `useMyBookingsQuery()` — key `['bookings']`, `GET /coaching/bookings`.
  - `useSessionTypesQuery(groupId)` — key `['coaching', groupId, 'session-types']`, enabled-guarded; client-side filter `is_active`.
  - `useCoachingExpertsQuery(groupId)` — key `['coaching', groupId, 'experts']`, enabled-guarded.
  - `useSlotsQuery(groupId, expertId, sessionTypeId)` — key `['coaching', groupId, 'slots', expertId, sessionTypeId]`, enabled only when ALL THREE non-empty; params per contract.
  - `useCreateBookingMutation(groupId)` — POST; onSuccess invalidate `['bookings']` AND `['coaching', groupId, 'slots']` prefix (booked slot disappears).
  - `useCancelBookingMutation(groupId)` — PUT cancel; onSuccess invalidate `['bookings']`.
- [ ] Tests per the reviews.test.tsx pattern (~8: fetch/enabled-gating for each query incl. the all-three-params slot guard; create posts body + invalidates both keys; cancel invalidates; error → no invalidate).
- [ ] Gates green → commit `feat(mobile): add coaching booking hooks`.

### Task 3: BookingCard + Coaching tab

- [ ] `booking-card.tsx` (design reference: web sessions/bookings UI — check `web/dashboard-next` features/pages for coaching components and copy): date/time line (localized via the existing date formatting approach in the app — keep simple, `toLocaleString` with sensible options), counterpart name (expert_name for students; show both names plainly — the card receives the booking and the CURRENT user id to decide which name to show), session type name, duration, status ZChip (pending/done/cancelled with token colors), optional notes line, optional recording affordance (when `recording?.asset_id`: ZButton ghost → `router.push('/asset/{asset_id}')` — wire via an `onOpenRecording` prop), cancel affordance via `onCancel` prop (rendered only when `status === 'pending'` AND `scheduled_at` is in the future — the card stays dumb, the screen decides). Tests: renders fields, status chip testIDs, cancel only for upcoming pending, recording button fires.
- [ ] `(tabs)/coaching.tsx` (replace placeholder): ZScreen edges top; header: title (i18n key if present — likely `common.nav.sessions` covers the web naming; VERIFY) + "Book session" ZButton (testID `coaching-book`, shown only with `coaching:book` permission) → `/book`. `useMyBookingsQuery()`; split into upcoming (`status==='pending' && scheduled_at > now`, ascending) and past (everything else, descending); section headings; states: skeleton cards/empty hint/error+retry/pull-to-refresh (established patterns). Cancel: two-step inline confirm on the card region (mirror the leave-group pattern) → `useCancelBookingMutation(booking.group_id)` → inline error on failure. Recording → `/asset/{id}`.
- [ ] Tests (`coaching-list.test.tsx`): four list states; upcoming/past split; book button permission-gated; cancel confirm flow fires mutateAsync; recording press navigates.
- [ ] Gates green + export → commit `feat(mobile): add coaching tab with bookings list`.

### Task 4: Guided booking flow `/book`

- [ ] `src/app/book.tsx` (modal route in the signed-in guard): stepper-like vertical flow with local state, each step a section that collapses to its selection (keep it simple — no new stepper primitive; selected value shown as a ZChip row):
  1. **Group**: `useGroupsQuery()` chips (skip/auto-select when exactly 1 group).
  2. **Expert**: `useCoachingExpertsQuery(groupId)` — chips with name (avatar tile optional); empty hint when none.
  3. **Session type**: `useSessionTypesQuery(groupId)` — active types as selectable rows (name, duration, description).
  4. **Slot**: `useSlotsQuery(groupId, expertId, sessionTypeId)` — group by day (`toDateString` bucketing), day headings, time chips; empty hint when no slots.
  5. **Confirm**: summary (expert, type, day+time, duration), optional notes ZTextarea, Book ZButton (testID `book-submit`) → `useCreateBookingMutation(groupId).mutateAsync({expert_id, session_type_id, scheduled_at: slot.starts_at, notes?})` → success → `router.back()` (list refreshes via invalidation); inline error on failure (the backend enforces min-notice/conflicts — surface its failure generically, translated where keys exist).
  Changing an earlier selection resets the later ones. Each step's loading state = skeletons.
- [ ] Tests (`book-flow.test.tsx`, mock all hooks): auto-select single group; selecting expert+type loads slots (slot query called with all three ids); picking a slot + submit posts the right body and navigates back; changing expert resets slot selection.
- [ ] Register `<Stack.Screen name="book" options={{ presentation: 'modal' }} />`; gates + export → commit `feat(mobile): add guided coaching booking flow`.

### Task 5: i18n + docs + final verification

- [ ] Key lookup: the dashboard's coaching UI is localized — expect keys under `coaching.*`/`sessions.*` (booking dialog, status labels, cancel copy, "book session"). Wire qualifying keys (en+de+fr); where copy is missing, ADD keys to the DASHBOARD sources the designed way (like Plan 7 did for `groups.invite.*` — tone-matched du/vous), `pnpm run sync:i18n`, then wire. Avoid leaving whole screens in English.
- [ ] `mobile/README.md`: Coaching section (booking flow; live calls follow in 8b with dev-client). Root README: no diagram change (same API).
- [ ] Full battery (mobile gates + api lint + Go suite + export) → commit `docs(mobile): document coaching booking` → push → PR #15 body Part 8a + keep the screenshots checklist item (coaching tab, booking flow).

---

## Out of Scope (Plan 8b + later)

- Join-call window UI, `/connect`, Agora call screen, recording stop — Plan 8b (expo-dev-client + EAS; needs the user).
- Expert tooling: session-type CRUD, availability, blocked slots — expert package.
- Booking reminders/push — push package.

## Verification Checklist (end of plan)

- [ ] ≥150 mobile tests green; export includes `/book`; no test routes
- [ ] Contract idempotent; Go suite green
- [ ] Book button gated on `coaching:book`; slots query fires only with all three params
- [ ] Cancel only on upcoming pending bookings; recording links open the asset screen
