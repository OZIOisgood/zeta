# Coaching cancellation notification — completion report

## Context

A coach reported via WhatsApp that a student had booked an appointment but nothing appeared under "Bevorstehend", and that she could not see when it was supposed to take place.

Diagnosis ran against Cloud Logging, because the dev database was not reachable from the workstation (the Google account has log access but no Cloud SQL or Secret Manager rights). `booking_created_email_sent` logs `scheduled_at`, `expert_id` and `booking_id`, which was enough:

- The coach is `user_01KW21JS6157E8J6GE23W7ZTAJ` — her booking timestamps match the notification list in her screenshot nine times out of nine.
- The booking was real: `4b60def4-5c2c-48d7-97db-fb5bce386419`, scheduled for 2026-08-21T12:15:00Z.
- It was cancelled six seconds after creation, by the student herself (`cancelled_by == student_id`).

So the tab counts were correct and nothing in the booking pipeline was broken. Two gaps made that unexplainable to her:

1. No in-app notification existed for cancellations — `notification_type` only knew `coaching_booking_created`. A booking appeared in the bell and then silently was not there anymore. Email was the only signal, and email delivery is not observable for support.
2. The booking notification never rendered the appointment time despite `scheduled_at` already being in its payload, and it deep-linked to a hardcoded `/sessions`, which opens the "upcoming" tab — empty in exactly this case.

A second report, from Kristof, was investigated and closed as correct behavior: no booking of his was ever cancelled, so no cancellation email was owed. He is a different user from the coach above.

## Scope

- New `coaching_booking_cancelled` notification type, recorded for the party that did **not** cancel, mirroring `sendCancellationEmail`'s recipient rule.
- Both booking notifications render the appointment time in the recipient's saved locale and timezone.
- Both deep-link to the tab that actually holds the booking, on dashboard and mobile.
- Push works for the new type, via the existing `pushCategory` mechanism.

Design spec and implementation plan are committed on the branch under `.agents/plans/` (`20260818101949_*` and `20260818102611_*`). The plan carries a "Corrections found during execution" section; the spec was corrected in place.

## Owner decisions taken during execution

- The date-format options are shared through `DashboardDateTimeService.formatSessionDateTime` rather than copied per component, so a notification and the sessions list cannot drift apart.
- The cancellation copy names the session, with a `coachingBookingCancelledNoSession` fallback key following the existing `videoUploaded`/`videoUploadedNoGroup` convention.
- An in-progress session counts as **upcoming** on both surfaces. The mobile list previously bucketed it as past while the dashboard bucketed it as upcoming; mobile was realigned to the dashboard rather than papering over the difference in the deep-link.

## Files touched

- `db/migrations/20260818102611_add_coaching_booking_cancelled_notification.{up,down}.sql`
- `internal/notifications/{types.go,record.go}`, `internal/push/message.go`
- `internal/coaching/{booking_email.go,bookings.go}`
- `docs/openapi.yaml`, `mobile/src/api/schema.d.ts` (generated)
- `web/dashboard-next/src/app/features/notifications/notification-presenter.ts`, `core/http/notifications-api.service.ts`, `core/i18n/dashboard-date-time.service.ts`, `core/shell/shell.component.ts`, `features/notifications/notification-list.component.ts`, `pages/notifications/notifications-page.component.ts`, `pages/sessions/sessions-page.component.ts`
- `mobile/src/lib/{notification-presenter.ts,datetime.ts}`, `mobile/src/components/notification-row.tsx`, `mobile/src/app/notifications.tsx`, `mobile/src/app/(tabs)/coaching/index.tsx`
- Copy in all six locale files

## Verification

Run independently at the end, not taken from subagent reports:

- `go test ./...` — all packages pass; `make api:build` succeeds
- `make web-next:test` — 47 files, 181 tests
- `make mobile:test` — 114 suites, 879 tests
- `make api:openapi:lint`, `make web-next:lint`, `make web-next:build`, `make mobile:lint`, `make mobile:typecheck` all clean during execution

Note: `make test:unit` fails `internal/auth.TestLogout_BearerFallback` on a developer machine because the Makefile exports `.env` and the test does not isolate `MOBILE_LOGOUT_RETURN_TO`. Pre-existing, reproduces on a clean tree, passes under a plain `go test ./...`.

## Defects found in the plan itself

Worth recording, because each was caught by review rather than by tests:

- The spec claimed the sessions page reads the tab from the query string. It reads a route path segment, and `/sessions` redirects to `/sessions/upcoming` with `pathMatch: 'full'`, so `?tab=` was silently dropped — the dashboard deep-link was inert while every test reported green. The presenter specs had pinned the broken contract.
- The plan mapped the new type in `pushCategory` but never added the matching `BuildMessage` case, so push would have silently no-opped.
- The plan never mentioned `notifications-api.service.ts`, whose type union and payload had to learn the new type before the presenter could compile.
- The plan seeded the mobile tab from `useLocalSearchParams` with a `useState` initializer, which only runs on mount — and the coaching screen deliberately stays mounted. Every deep link after the first was ignored.

## Follow-ups

- **Outstanding for a human:** emulator screenshots of the notification list and the deep-linked coaching tab, required by AGENTS.md for mobile UI changes in the PR description. No emulator was bootable in this WSL2 environment.
- Home-tab "upcoming" counter still uses the start-time-only rule, so it can differ by one from the coaching tab during a live session.
- Mobile still offers swipe-to-cancel inside the 1h `CANCELLATION_NOTICE` before a session starts, where the API returns 400; the dashboard hides it.
- Detached notification goroutines run on a bare `context.Background()` with no timeout and no `recover()` — now established twice. One shared helper would cover both call sites.
- The RNTL `act()` corruption pattern (two un-flushed `fireEvent.press` calls on sibling `Pressable`s poison the next test in the file) was fixed only where it surfaced; `mobile/src/__tests__/asset-detail.test.tsx` is the remaining candidate.
- `sessionsTabFor` is duplicated verbatim across the two presenters, per the existing mirrored-port convention, and now carries more logic than before.
