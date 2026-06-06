# Notifications — Implementation Completion Report

Plan: `.agents/plans/20260605182000_notifications_implementation.md`
Branch: `notifications_2`

## Context

Implemented in-app notifications: a navbar bell with an unread badge and a
dropdown listing five event types (group invitation received, member joined →
owner, video reviewed, video uploaded → expert, coaching booking created →
expert). Ported the isolated notifications snapshot from `feat/notifications`
(`545c17f`) onto current `main`, then extended it to the design handoff.

## Decisions

- Ported commit `545c17f` file-by-file rather than merging the branch (its lower
  commits were a stale variant of threading work already on `main`).
- Kept `main`'s `user_preferences` author logic in reviews; re-applied only the
  `video_reviewed` emission hook by hand.
- Regenerated `sqlc` + mocks instead of copying generated blobs (installed
  `sqlc v1.30.0` + `mockgen v0.6.0`, which were missing locally).
- Inline invite Accept/Decline: built a real `POST /groups/invitations/decline`
  endpoint (new `declined` enum value via migration). Generic link/QR invites are
  not mutated on decline (shared link stays usable); only email invites persist.
- "All notifications" page reachable only via the dropdown footer link (no
  sidebar entry). Read-on-click kept as default.

## Files touched

Backend (new): `internal/notifications/*` (8 files),
`db/migrations/20260605120500_create_notifications.*`,
`db/migrations/20260605193000_add_declined_invitation_status.*`,
`db/queries/notifications.sql`.
Backend (modified): `internal/api/server.go`, `internal/auth/workos.go` (+mock),
`internal/invitations/handler.go` (+2 emission hooks, decline handler, +tests),
`internal/assets/handler.go`, `internal/reviews/handler.go` (+test fixes),
`internal/coaching/{bookings.go,booking_email.go}`,
`db/queries/video_reviews.sql` (extended `GetAssetOwnerByVideoID`), regenerated
`internal/db/*`.

Frontend (new): `core/http/{notifications,invitations}-api.service.ts`,
`features/notifications/{notification-presenter.ts,notifications.store.ts,
notification-list.component.ts,notifications.store.spec.ts}`,
`pages/notifications/notifications-page.component.ts`.
Frontend (modified): `core/shell/shell.{component.ts,html}`,
`core/state/app-shell.store.ts`, `app.routes.ts`, `styles.scss` (z-bump /
z-arrive keyframes + `.badge-bump`), `public/i18n/{de,en,fr}.json`.

## Design polish delivered

Day grouping (Today/Earlier), distinct per-type icons with soft tints, loading
skeleton, inline invite Accept/Decline with resolved states, badge bump on live
arrival, row arrival flash, full `/notifications` page with All/Unread tabs +
dropdown footer link, mobile full-width panel. Shared `NotificationListComponent`
backs both dropdown and page.

## Verification

- `make api:build` green; `go test ./...` green (incl. new
  notifications/decline tests).
- `sqlc generate` + mock regen clean; migrations applied to local DB
  (`schema_migrations` 20260605193000, clean).
- `make web-next:build` green (no NG warnings from this work); frontend tests
  71 passed (27 files), incl. accept/decline/grouping store tests.
- Prettier clean across all notification-surface files; gofmt clean on all
  touched Go files.

## Follow-ups

- `make web-next:lint` still fails only on the untracked, pre-existing
  `web/dashboard-next/CLAUDE.md` (not part of this work; not committed).
- The decline down-migration recreates the enum (resets any `declined` rows to
  `pending`); fine for dev, destructive if ever rolled back in prod.
- Mobile dropdown is a full-width anchored panel, not the full-screen bottom
  sheet from the prototype — acceptable v1, can be upgraded later.
- Toolchain: `sqlc`/`mockgen` were installed to `~/go/bin`; CI/other machines
  need them on PATH for `make db:sqlc` / `make mocks`.

## Review follow-up (2026-06-06)

Self-review findings addressed:

1. **Decline authorization** — `DeclineInvitation` now verifies the signed-in
   user is the addressed recipient for email invitations (`invitation.Email ==
   user.Email`, case-insensitive); non-recipients get 404 (no code oracle).
   Generic link/QR invites unchanged. +2 tests.
2. **Positive-path emission tests** — added `TestAcceptInvitationNotifiesGroupOwner`
   (member_joined) and `TestCreateReview_NotifiesVideoOwner` (video_reviewed),
   both goroutine-synced via a channel on the `CreateNotification` mock. (Uploaded
   / booking hooks have no handler-level test scaffolding — identical `Record`
   call shape, lower risk; left as a known gap.)
3. **Frontend tests** — new `notification-presenter.spec.ts` (7 cases, all type
   mappings) and `notification-list.component.spec.ts` (invite actions, resolved
   state, empty, skeleton).
4. **Invite failure feedback** — shell + page now `await` accept/decline and show
   an error toast via `AppShellStore.showToast` on failure (new
   `notifications.invite.{errorTitle,acceptError,declineError}` i18n keys).

Re-verified: `go test ./...` green, gofmt clean; `make web-next:build` green,
frontend tests **82 passed** (29 files); prettier clean on the notification
surface.

## Invite resolution persists across reloads (2026-06-06)

Previously the accept/decline buttons reappeared after a reload because the
resolved state lived only in the client (`inviteState`). Fix:
- `List` now enriches `group_invitation_received` items with the live invitation
  status (`invite_status`: pending/accepted/declined/expired) via
  `GetGroupInvitationByCode`; `item.InviteStatus` added to the wire shape. Empty
  for live SSE pushes (still actionable). +1 handler test.
- The list component shows accept/decline only via `showActions()` (actionable),
  and renders the resolved/expired label from `resolved()` which prefers the
  optimistic client state and falls back to the server `invite_status`. New
  `notifications.invite.expired` i18n key; +1 component spec.
- Note: the eight `internal/notifications/*.go` files had picked up CRLF line
  endings from editing over the Windows path — normalized back to LF with
  `gofmt -w`. Worth a pre-commit `gofmt -l` check.
