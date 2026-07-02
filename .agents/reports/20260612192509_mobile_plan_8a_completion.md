# Completion Report: Mobile Plan 8a — Coaching Booking

- **Date:** 2026-06-12
- **Plan:** `.agents/plans/20260612175629_mobile_plan_8a_coaching_booking.md`
- **PR:** https://github.com/OZIOisgood/zeta/pull/15 (eighth work package; single-PR strategy)

## What landed

- Contract: six coaching operations verified against the Go handlers — bookings (cross-group + per-group), session types, experts, slots (`expert_id`+`session_type_id` required), create (201; 400 min-notice; 409 conflict), cancel (200; 400 notice; 404 non-participant; 409 already cancelled). Booking `status` is response-time-derived (pending/done/cancelled).
- Hooks (`coaching.ts`): four queries (enabled-guarded; slots gated on all three ids) + create/cancel mutations with correct invalidation (`['bookings']`, slots prefix); `BookingError` carries the HTTP status.
- Coaching tab: upcoming/past split, status chips via existing `common.status.*` keys, two-step cancel via per-booking `CancelConfirm` child (hooks-in-loop solved), recording links into `/asset/[id]`, book entry gated on `coaching:book`.
- `/book` guided flow (modal, auth-gated): group auto-select, expert chips, **expert-scoped** session types, day-grouped slot chips, confirm with optional notes. Distinct error UX: 409 → `sessions.book.slotTaken` (existing key) + slot reset + slots refresh; 400 → `sessions.book.tooLate` (new dashboard key, de/fr tone-matched).
- Interleaved on the branch (user-started task chip): **CompleteUpload ownership fix** (`aeeec75` — GetVisibleAsset 404 + owner 403 + four handler tests); contract updated here (`eb7f685`).

## Decisions

- **Session types are expert-scoped in the mobile flow** (domain model: `coaching_session_types.expert_id`; the expert creates their offerings). The web booking dialog shows all active group types — flagged as a candidate web bug, documented in code.

## Defects caught by the review loops (fixed in-range)

1. Error state on the coaching tab showed empty-state copy (`sessions.empty.upcomingDescription`) → new `sessions.loadFailed` key.
2. Generic booking errors despite documented 400/409 semantics → typed `BookingError` + distinct copy + slot refresh on conflict.
3. Notes survived expert/type re-selection in the flow → reset cascades complete; redundant `notesRef` removed.
4. Dead ternary branch in the status chip; missing cancel-error/abort tests → fixed/added.

## Verification

173 mobile tests (38 suites), tsc, lint, web-next lint (dashboard i18n edits), `expo export` (17 routes incl. `/book`), OpenAPI lint + idempotency, full Go suite — all green. Emulator screenshots still pending (PR checklist).

## Follow-ups

- **Plan 8b: Agora live calls** — expo-dev-client + EAS build; needs user setup (EAS account, dev build on device); connect-window Join UI on booking cards.
- Selectable-card `z-*` primitive (one raw Pressable card in `/book` deviates from the guardrail).
- Web: expert-scope the booking dialog's session types (candidate bug).
- Later packages: push + deep links, expert tooling, compliance (account deletion, SIWA).
