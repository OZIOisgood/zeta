# Coaching booking cancellation notification

## Context

A coach reported that a student's booking never showed under "Bevorstehend". Cloud Logging showed the booking was real (`4b60def4-5c2c-48d7-97db-fb5bce386419`, scheduled 2026-08-21T12:15:00Z) and that the student cancelled it herself six seconds after creating it. The tab counts were correct; nothing in the booking pipeline is broken.

Two gaps made that unexplainable to the coach:

- There is no in-app notification for cancellations. `notification_type` only knows `coaching_booking_created`, so a booking appears in the bell and then silently is not there anymore. Only an email is sent, and email delivery is not observable for support.
- The booking notification never renders the appointment time even though `scheduled_at` is already in the payload, and its deep-link is hardcoded to `/sessions`, which opens the "Bevorstehend" tab — empty in exactly this case.

## Decision and scope

- Add a `coaching_booking_cancelled` notification type, recorded for the party that did **not** cancel, mirroring the recipient logic of the existing cancellation email.
- Render the appointment date and time in both booking notifications, formatted in the recipient's saved locale and timezone.
- Deep-link each booking notification to the tab that actually contains the booking.
- Keep dashboard and mobile presenters structurally identical, as documented in the mobile presenter header.
- Map the new type in `pushCategory` to `EmailCategoryCoachingBookingUpdates`, the same category as `coaching_booking_created`. Push is not new work: `notifications.Record` already pushes any mapped type, so leaving the mapping out would make cancellations the only booking event without push.
- Do not change booking, cancellation, reminder, or email behavior.

## Design

### Backend

- Migration `db/migrations/20260818101949_add_coaching_booking_cancelled_notification.{up,down}.sql`.
  Up: `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coaching_booking_cancelled';` following `20260621183000_add_group_invitation_revocation.up.sql`.
  Down: delete rows of that type, then rebuild the enum via rename/create/`USING status::text::…`/drop, following that migration's down script. `notifications.type` has no default, so none needs restoring.
- `internal/notifications/types.go`: add `TypeCoachingBookingCancelled` and `CoachingBookingCancelledPayload{booking_id, group_id, group_name, actor_name, session_name, scheduled_at, duration_minutes}`. `actor_name` rather than `student_name`, because either party can cancel. `duration_minutes` goes on the created payload too — the tab derivation needs the end time, not just the start.
- `internal/coaching/booking_email.go`: add `recordBookingCancelledNotification(b, sessionTypeName, cancelledByID)` next to `recordBookingCreatedNotification`. Recipient is `cancelledByID == b.StudentID ? b.ExpertID : b.StudentID`; `actor_name` comes from `resolveParticipant(cancelledByID)`.
- `internal/coaching/bookings.go`: call it in `CancelBooking` beside `sendCancellationEmail` (line 548).
- Run `make db:sqlc` for the regenerated `db.NotificationType`.
- `docs/openapi.yaml`: extend the `NotificationItem.type` description and add `actor_name` to `NotificationPayload`.

### Presenter contract

Both presenters are pure and separately unit-tested, so formatting is injected rather than imported:

```ts
presentNotification(item: NotificationItem, formatWhen: (iso: string) => string): NotificationPresentation
notificationHref(item: NotificationItem): Href   // link only, no formatting
```

`notificationHref` exists because `mobile/src/app/notifications.tsx:80` needs only the target and should not have to supply a formatter. `presentNotification` uses it internally.

Tab derivation from the payload:

- `coaching_booking_cancelled` → `cancelled`
- `coaching_booking_created` → `upcoming` while `scheduled_at + duration_minutes` is still in the future at render time, otherwise `past`. A session counts as upcoming until it **ends**, not until it starts — that matches the dashboard store, and the mobile list is realigned to the same rule.
- missing or unparseable `scheduled_at` → `upcoming`; no start time means no information at all
- missing, zero, or non-finite `duration_minutes` → treated as a zero-length session, i.e. the start-time-only rule. Only rows predating this change lack the field, and those sessions have ended.

### Dashboard

- `notification-presenter.ts`: add the cancelled case, add the `when` param to both booking cases, and build `/sessions/<derived>`.
- The options live once, in `DashboardDateTimeService.formatSessionDateTime`, which the sessions page uses too — so a notification and the sessions list cannot drift apart. `notification-list.component.ts` injects the service and passes that method as the formatter; `notifications-page.component.ts` needs only the link and uses `notificationLink`. `shell.component.ts` renders `<z-notification-list>` and presents nothing itself.
- The tab is a **route path segment**, not a query param: `app.routes.ts` declares `sessions/:tab`, `/sessions` redirects to `/sessions/upcoming` with `pathMatch: 'full'`, and the page reads `route.paramMap`. A `?tab=` query param is silently dropped by that redirect. No routing change is needed, but the link must be a path.

### Mobile

- `lib/notification-presenter.ts`: same two changes, with `href: { pathname: '/coaching', params: { tab } }`.
- `lib/datetime.ts`: add `formatDateTime(iso)` for the notification line, locale-aware like the existing `formatDate`.
- `components/notification-row.tsx` passes the formatter; `app/notifications.tsx` switches to `notificationHref`.
- `app/(tabs)/coaching/index.tsx`: initialize `activeTab` from `useLocalSearchParams` instead of the hardcoded `'upcoming'`, falling back to `'upcoming'` for absent or unknown values.

### Copy

Added to `web/dashboard-next/public/i18n/{de,en,fr}.json` and `mobile/src/i18n/locales/{de,en,fr}.json` under `notifications.types`:

- `coachingBookingCreated` (changed): `{{student}} hat einen Termin mit dir gebucht — {{when}}`
- `coachingBookingCancelled` (new): `{{actor}} hat den Termin am {{when}} abgesagt`

## Verification

- `make test:unit` — recipient and payload of the new notification in `internal/coaching/booking_email_test.go`
- `make db:sqlc` and `make api:build`
- `make web-next:test` — presenter cases for both types plus tab derivation, including the past/upcoming split
- `make web-next:lint` and `make web-next:build`
- `make mobile:test`, `make mobile:lint`, `make mobile:typecheck` — presenter parity and the deep-link tab in the coaching screen
- Emulator screenshot of the notification list and the deep-linked coaching tab for the PR description

## Follow-ups

- Email delivery is not observable beyond Resend's acceptance. If recipients keep reporting missing mail, add delivery-status tracking; out of scope here.
