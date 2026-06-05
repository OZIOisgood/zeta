# In-App Notifications — Implementation Plan

## Context

Add a bell icon to the navbar that shows a badge on relevant events and opens a
dropdown listing those events. Five relevant event types:

| # | Event | Recipient | Backend type |
|---|-------|-----------|--------------|
| 1 | Received a group invitation | invited user (if registered) | `group_invitation_received` |
| 2 | New member joined your group | group **owner** only | `group_member_joined` |
| 3 | Your video was reviewed | asset owner (uploader) | `video_reviewed` |
| 4 | A video was uploaded for you | group owner (expert/coach) | `video_uploaded` |
| 5 | A coaching booking was created | expert | `coaching_booking_created` |

Two reference inputs were reviewed:

- **Design handoff** — `docs/handoffs/design_handoff_notifications/`
  (`notifications.html` + `notifications-app.jsx` + `notifications-data.jsx`).
  React prototype of the bell, dropdown, day-grouping, full page, and tweaks.
- **`feat/notifications` branch** — already contains a near-complete,
  high-quality implementation of the entire feature.

## Key decision: port the isolated notifications commit, don't merge the branch

`feat/notifications` is **6 commits** ahead of `main`. Only the **top commit
`545c17f` ("wip: notifications snapshot")** is the notifications feature. The
five commits below it are an *older* version of the threaded-comments / review
author-identity work that has **already landed on `main`** (commits `5807ed8`,
`8b6e73c`) in a different form. Merging or cherry-picking the whole branch would
drag in stale, conflicting review code.

**Plan: re-create commit `545c17f` on top of the current branch**, file by file.
Most of it applies cleanly; a small, known set needs manual handling (below).

### Reusable as-is (clean — copy from `545c17f`)

Backend `internal/notifications/` (the whole package is self-contained and well
designed):
- `types.go` — `Type` constants + denormalized per-type payload structs.
- `record.go` — `Record(...)` fire-and-forget writer; logs+swallows errors so a
  notification failure never breaks the originating request.
- `hub.go` — in-process SSE fan-out keyed by recipient; non-blocking publish.
- `listener.go` — dedicated PG connection `LISTEN`s on the `notifications`
  channel (fed by a DB trigger) and fans out via the hub; reconnect w/ backoff.
- `handler.go` — routes `GET /` (list + unread count), `GET /stream` (SSE,
  cookie auth, 25s heartbeat), `POST /read-all`, `POST /{id}/read`. Recipient is
  in every WHERE clause, so a user can only touch their own rows.
- `item.go`, `handler_test.go`, `hub_test.go`.

DB:
- `db/migrations/20260605120500_create_notifications.{up,down}.sql` — `notification_type`
  enum, `notifications` table, `idx_notifications_recipient`, and the
  `pg_notify` trigger that drives SSE delivery.
- `db/queries/notifications.sql` — Create / Get / List / CountUnread /
  MarkRead / MarkAllRead.

Wiring:
- `internal/api/server.go` — build `Hub` + `Handler`, start the `Listener`
  goroutine, mount `r.Route("/notifications", handler.RegisterRoutes)`.

Emission hooks (small, self-contained additions):
- `internal/invitations/handler.go` — `CreateInvitation` (invite received, only
  if the email maps to a registered WorkOS user) **and** `AcceptInvitation`
  (member joined → owner, skipped when the joiner *is* the owner).
- `internal/assets/handler.go` — `CreateAsset` (video uploaded → group owner),
  recorded independently of email preferences.
- `internal/coaching/bookings.go` — `CreateBooking` →
  `recordBookingCreatedNotification` (booking created → expert).

Frontend (all clean — `shell.component.ts` and `app-shell.store.ts` are
byte-identical to `main`'s parent, so they apply without conflict):
- `core/http/notifications-api.service.ts` — typed client incl. `streamUrl()`.
- `features/notifications/notification-presenter.ts` — pure map from item →
  i18n key + interpolation params + deep-link + icon (unit-tested).
- `features/notifications/notifications.store.ts` — NgRx signal store: `load`,
  optimistic `markRead` / `markAllRead`, `connect`/`disconnect` over
  `EventSource` (resync on reconnect, dedupe, `9+` badge), `notifications.store.spec.ts`.
- `core/shell/shell.component.ts` + `shell.html` — bell button, badge, dropdown
  list, empty state; loads + connects on init, disconnects on destroy; closes on
  route change / outside click / Escape.
- `core/state/app-shell.store.ts` — `isNotificationsOpen` + toggle/close.
- `public/i18n/{de,en,fr}.json` — `notifications.*` keys.

### Needs manual handling (do NOT blindly copy the blob)

1. **`internal/reviews/handler.go`** — CONFLICTS. `main` refactored review author
   resolution to use `user_preferences` as the source of truth (commit `8b6e73c`);
   `545c17f`'s parent still used `userInfo.FirstName`. Re-apply *only* the
   `video_reviewed` emission hook in `CreateReview` (the `notifications.Record(...,
   asset.OwnerID, TypeVideoReviewed, VideoReviewedPayload{...})` block) on top of
   `main`'s current `CreateReview`. Ignore the surrounding author-name changes in
   the diff — they are already on `main`.

2. **Generated Go files** — do not copy blobs. After adding the query + migration,
   regenerate: `make db:sqlc` (rewrites `internal/db/notifications.sql.go`,
   `models.go`, `querier.go`) and regenerate mocks (`internal/db/mocks/mock_querier.go`,
   `internal/auth/mocks/mock_workos.go` — `ListUsers` is newly used). Verify the
   diff matches `545c17f`'s generated output.

3. **`internal/auth/workos.go` + mock** — `545c17f` adds a `ListUsers` wrapper used
   by the invite-received emission. Port the interface method + regenerate the mock.

4. **`public/i18n/de.json`** — minor context drift in the `inviteDialog` block
   (unrelated to notifications). Add the `notifications.*` keys; resolve the tiny
   inviteDialog hunk by keeping `main`'s version.

## Build & polish to match the design handoff

The `545c17f` dropdown is a **flat list**. The design handoff goes further. After
the port lands and builds green, add these (each is incremental, design-faithful):

1. **Day grouping** in the dropdown — "Heute" / "Früher" section labels
   (`groupByDay` in `notifications-data.jsx`). Add the keys to i18n.
2. **Full "All notifications" page** — new route + `NotificationsPage` with
   "Alle" / "Ungelesen" tabs (`Tabs`), `markAllRead` action. **Decision: reachable
   ONLY via the "Alle Benachrichtigungen ansehen" footer link in the dropdown —
   NOT a sidebar nav entry.** (Prototype: `notifications-app.jsx:370`.)
3. **Inline invite Accept/Decline** for `group_invitation_received` rows.
   **Decision: inline buttons directly in the notification row** (not the
   deep-link fallback). Wire the buttons to the existing invitation accept/decline
   endpoints, show the resolved state ("Angenommen" / "Abgelehnt") in-row after
   action, and mark the notification read on action.
4. **Loading skeleton** in the dropdown while `status === 'loading'` (the store
   already exposes the state); avoid loading text per Frontend Rules.
5. **Badge bump animation** on unread-count increase + **row arrival flash** for
   live SSE events (`zn-bump` / `zn-arrive` keyframes; honor
   `prefers-reduced-motion`).
6. **Distinct per-type icons** — `545c17f` collapses review+upload to
   `lucideVideo`. Map to the design's set: invite→`users`,
   member→`circle-user-round`(`UserRound`), review→`check-circle-2`(`CircleCheck`),
   upload→`file-video`, booking→`calendar-days`. Optional per-type tints.
7. **Mobile** — dropdown becomes a full-screen sheet under 768px (design CSS),
   and the bell stays in the header. Verify against existing shell responsive
   behavior.

Reuse existing `shared/ui` primitives (Tabs, Card, Badge, EmptyState, Avatar,
Toast, icon-button) before adding anything new, per Frontend Rules.

## Execution order

1. **DB layer** — add migration + `notifications.sql`; `make db:sqlc`;
   `make infra:restart` and confirm the migration applies and the trigger fires.
2. **Backend package** — copy `internal/notifications/*`; add `auth.ListUsers` +
   regenerate mocks; wire `server.go`; `make api:build`.
3. **Emission hooks** — invitations (×2), assets, coaching (clean copy);
   reviews (manual re-apply). `make api:build`.
4. **Frontend core** — api service, presenter, store, app-shell store; bell +
   dropdown in shell; i18n keys (de/en/fr). `make web-next:lint web-next:build`.
5. **Design polish** — items 1–7 above, smallest-first.
6. **Tests** — `make test:unit` (notifications handler/hub + emission), and the
   frontend store spec via `make web-next:test`.

## Verification

- `make db:sqlc` — no uncommitted drift afterwards.
- `make api:build` and `make test:unit` green (incl. `internal/notifications`,
  invitations/reviews/assets/coaching emission tests).
- `make web-next:lint`, `make web-next:build`, `make web-next:test` green.
- Manual: trigger each of the 5 events, confirm the badge increments live (SSE),
  the dropdown renders correct copy + deep-link, mark-read / mark-all-read
  persist across reload, and authorization holds (a user never sees or mutates
  another user's notifications).
- Confirm no sensitive data (tokens, full emails, PII) is logged — payloads
  store names/titles only.

## Resolved decisions (2026-06-05)

- **Reviews conflict (1.1):** keep `main`'s `user_preferences` author logic;
  re-apply ONLY the `video_reviewed` emission hook by hand.
- **Generated files (1.2):** regenerate via `make db:sqlc` + mock regeneration,
  never copy blobs.
- **i18n / auth drift (1.3):** keep `main`'s version of the conflicting hunks.
- **Align fully to the design handoff** — execute the whole polish phase
  (day-grouping, full page, inline invite, skeleton, animations, distinct icons,
  mobile sheet). The handoff is intentionally ahead of the ported baseline.
- **Invite Accept/Decline (3.1):** inline buttons in the notification row.
- **"All notifications" page route (3.2):** dropdown footer link only, no sidebar
  entry. Suggested path `/notifications`.
- **Read-state on click:** keep the default — clicking a notification marks it
  read (matches the prototype). Revisit only if product objects.

## Files touched (summary)

New: `internal/notifications/*` (8 files), `db/migrations/20260605120500_*`,
`db/queries/notifications.sql`, `web/.../core/http/notifications-api.service.ts`,
`web/.../features/notifications/{notification-presenter.ts,notifications.store.ts,
notifications.store.spec.ts}`.

Modified: `internal/api/server.go`, `internal/invitations/handler.go`,
`internal/assets/handler.go`, `internal/coaching/bookings.go`,
`internal/reviews/handler.go` (manual), `internal/auth/workos.go` (+mock),
regenerated `internal/db/*` + mocks, `web/.../core/shell/shell.{component.ts,html}`,
`web/.../core/state/app-shell.store.ts`, `public/i18n/{de,en,fr}.json`, `README.md`.

## Reference

- Source commit to port: `feat/notifications` @ `545c17f` (isolated snapshot).
- Design prototype: `docs/handoffs/design_handoff_notifications/`.
