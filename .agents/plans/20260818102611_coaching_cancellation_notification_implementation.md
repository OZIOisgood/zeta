# Coaching Cancellation Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify the other party in-app when a coaching booking is cancelled, and make both booking notifications show the appointment time and link to the tab that actually contains the booking.

**Architecture:** A new `coaching_booking_cancelled` notification type is recorded in `CancelBooking` beside the existing cancellation email, reusing that email's recipient rule. Both client presenters stay pure and receive a date formatter as an argument, so each surface formats in its own locale and timezone stack. The deep-link tab is derived from the payload at render time.

**Tech Stack:** Go 1.x + chi + sqlc + pgx, Angular 21 with NgRx Signals and Transloco, Expo/React Native with expo-router, NativeWind and i18next.

**Design spec:** `.agents/plans/20260818101949_coaching_booking_cancellation_notification.md`

## Global Constraints

- Structured `log/slog` logging only; every log carries `component`, errors use the `err` field. Never log tokens, cookies, emails, or other PII.
- Database, API fields, and Go types keep the `booking` vocabulary. User-facing copy says "Termin" / "appointment".
- Every user-facing string exists in all six locale files: `web/dashboard-next/public/i18n/{de,en,fr}.json` and `mobile/src/i18n/locales/{de,en,fr}.json`.
- The dashboard and mobile presenters stay structurally identical; the only permitted divergence is the deep-link shape (`link` + `queryParams` on web, `href` on mobile), as documented in the mobile presenter's header comment.
- Angular code must satisfy strict templates. Reuse existing `z-*` and `ng-primitives` components; do not add new primitives.
- Commit at the end of each task.

---

### Task 1: Notification type, enum value, and push mapping

**Files:**
- Create: `db/migrations/20260818102611_add_coaching_booking_cancelled_notification.up.sql`
- Create: `db/migrations/20260818102611_add_coaching_booking_cancelled_notification.down.sql`
- Modify: `internal/notifications/types.go:16`
- Modify: `internal/notifications/record.go:32-47`
- Test: `internal/notifications/record_test.go:233`

**Interfaces:**
- Consumes: nothing.
- Produces: `notifications.TypeCoachingBookingCancelled Type = "coaching_booking_cancelled"` and `notifications.CoachingBookingCancelledPayload` with fields `BookingID, GroupID, GroupName, ActorName, SessionName, ScheduledAt string`.

Push is not extra work here: `Record` already sends a push for any type that `pushCategory` maps. Mapping the new type to the same category as `coaching_booking_created` keeps the two consistent; omitting it would silently make cancellations the only booking event without push.

- [ ] **Step 1: Add the failing case to the push mapping test**

In `internal/notifications/record_test.go`, add one row to the `tt` table in `TestPushCategory`, directly below the `TypeCoachingBookingCreated` row:

```go
		{TypeCoachingBookingCancelled, "coaching_booking_updates", true},
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/notifications -run TestPushCategory`
Expected: FAIL — compile error `undefined: TypeCoachingBookingCancelled`

- [ ] **Step 3: Add the type constant and payload**

In `internal/notifications/types.go`, add to the `const` block after `TypeCoachingBookingCreated`:

```go
	TypeCoachingBookingCancelled Type = "coaching_booking_cancelled"
```

And after `CoachingBookingCreatedPayload`:

```go
// ActorName is whoever cancelled — either party can, so it is not student_name.
type CoachingBookingCancelledPayload struct {
	BookingID   string `json:"booking_id"`
	GroupID     string `json:"group_id,omitempty"`
	GroupName   string `json:"group_name,omitempty"`
	ActorName   string `json:"actor_name"`
	SessionName string `json:"session_name,omitempty"`
	ScheduledAt string `json:"scheduled_at,omitempty"` // RFC3339
}
```

- [ ] **Step 4: Add the push category mapping**

In `internal/notifications/record.go`, in `pushCategory`, after the `TypeCoachingBookingCreated` case:

```go
	case TypeCoachingBookingCancelled:
		return preferences.EmailCategoryCoachingBookingUpdates, true
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `go test ./internal/notifications -run TestPushCategory`
Expected: PASS

- [ ] **Step 6: Write the migrations**

`db/migrations/20260818102611_add_coaching_booking_cancelled_notification.up.sql`:

```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coaching_booking_cancelled';
```

`db/migrations/20260818102611_add_coaching_booking_cancelled_notification.down.sql` — Postgres cannot drop an enum value, so the type is rebuilt. Existing rows of the removed type are deleted first; there is no column default to restore.

```sql
DELETE FROM notifications WHERE type = 'coaching_booking_cancelled';

ALTER TYPE notification_type RENAME TO notification_type_old;
CREATE TYPE notification_type AS ENUM (
    'group_invitation_received',
    'group_member_joined',
    'video_reviewed',
    'video_uploaded',
    'coaching_booking_created'
);
ALTER TABLE notifications
    ALTER COLUMN type TYPE notification_type USING type::text::notification_type;
DROP TYPE notification_type_old;
```

- [ ] **Step 7: Apply the migration and regenerate sqlc**

Run: `make infra:restart` (only if the local database is not running), then `make db:migrate:up`, then `make db:sqlc`
Expected: `internal/db/models.go` gains the `NotificationTypeCoachingBookingCancelled` constant; no other generated diff.

- [ ] **Step 8: Verify the package builds and all its tests pass**

Run: `go test ./internal/notifications -count=1 && make api:build`
Expected: PASS, build succeeds

- [ ] **Step 9: Commit**

```bash
git add db/migrations internal/notifications internal/db
git commit -m "feat(notifications): add coaching_booking_cancelled notification type"
```

---

### Task 2: Record the cancellation notification

**Files:**
- Modify: `internal/coaching/booking_email.go` (add after `recordBookingCreatedNotification`, which ends at line 52)
- Modify: `internal/coaching/bookings.go:548`
- Test: `internal/coaching/booking_email_test.go`

**Interfaces:**
- Consumes: `notifications.TypeCoachingBookingCancelled`, `notifications.CoachingBookingCancelledPayload` from Task 1.
- Produces: `(*Handler).recordBookingCancelledNotification(b db.CoachingBooking, cancelledByID string)` — fire-and-forget wrapper — and `(*Handler).writeBookingCancelledNotification(ctx context.Context, b db.CoachingBooking, cancelledByID string)` — the synchronous body.

The body is a separate function because `recordBookingCreatedNotification` runs its work inside `go func()`, which a test cannot await. Tests call the synchronous form.

- [ ] **Step 1: Write the failing test**

Append to `internal/coaching/booking_email_test.go`. It asserts the recipient rule in both directions and the payload contents:

```go
func TestWriteBookingCancelledNotificationTargetsOtherParty(t *testing.T) {
	tests := []struct {
		name          string
		cancelledBy   string
		wantRecipient string
		wantActorName string
	}{
		{"student cancels, expert is notified", "student-1", "expert-1", "Local Student"},
		{"expert cancels, student is notified", "expert-1", "student-1", "Local Expert"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			q := dbmocks.NewMockQuerier(ctrl)
			sender := emailmocks.NewMockSender(ctrl)
			workos := authmocks.NewMockUserManagement(ctrl)
			h := NewHandler(q, nil, sender, workos, slog.Default(), HandlerConfig{})

			var id pgtype.UUID
			if err := id.Scan("11111111-1111-1111-1111-111111111111"); err != nil {
				t.Fatalf("scan id: %v", err)
			}

			scheduled := time.Date(2026, 8, 21, 12, 15, 0, 0, time.UTC)
			booking := db.CoachingBooking{
				ID:              id,
				ExpertID:        "expert-1",
				StudentID:       "student-1",
				GroupID:         id,
				SessionTypeID:   id,
				ScheduledAt:     pgtype.Timestamptz{Time: scheduled, Valid: true},
				DurationMinutes: 45,
			}

			q.EXPECT().GetSessionType(gomock.Any(), db.GetSessionTypeParams{ID: id, GroupID: id}).
				Return(db.CoachingSessionType{Name: "Private Session"}, nil)
			q.EXPECT().GetGroup(gomock.Any(), id).Return(db.Group{Name: "Training"}, nil)
			workos.EXPECT().GetUser(gomock.Any(), usermanagement.GetUserOpts{User: tc.cancelledBy}).
				Return(usermanagement.User{ID: tc.cancelledBy, Email: "someone@example.com"}, nil)

			firstName, lastName := "Local", "Student"
			if tc.cancelledBy == "expert-1" {
				lastName = "Expert"
			}
			q.EXPECT().GetUserPreferences(gomock.Any(), tc.cancelledBy).Return(
				db.UserPreference{UserID: tc.cancelledBy, FirstName: firstName, LastName: lastName, Language: db.LanguageCodeEn},
				nil,
			)

			var got db.CreateNotificationParams
			q.EXPECT().CreateNotification(gomock.Any(), gomock.Any()).
				DoAndReturn(func(_ context.Context, arg db.CreateNotificationParams) (db.Notification, error) {
					got = arg
					return db.Notification{}, nil
				})

			h.writeBookingCancelledNotification(t.Context(), booking, tc.cancelledBy)

			if got.RecipientID != tc.wantRecipient {
				t.Fatalf("recipient = %q, want %q", got.RecipientID, tc.wantRecipient)
			}
			if got.Type != db.NotificationTypeCoachingBookingCancelled {
				t.Fatalf("type = %q, want coaching_booking_cancelled", got.Type)
			}

			var payload notifications.CoachingBookingCancelledPayload
			if err := json.Unmarshal(got.Payload, &payload); err != nil {
				t.Fatalf("unmarshal payload: %v", err)
			}
			if payload.ActorName != tc.wantActorName {
				t.Fatalf("actor_name = %q, want %q", payload.ActorName, tc.wantActorName)
			}
			if payload.ScheduledAt != "2026-08-21T12:15:00Z" {
				t.Fatalf("scheduled_at = %q, want 2026-08-21T12:15:00Z", payload.ScheduledAt)
			}
			if payload.SessionName != "Private Session" {
				t.Fatalf("session_name = %q, want Private Session", payload.SessionName)
			}
		})
	}
}
```

Add `"context"`, `"encoding/json"`, and `"github.com/OZIOisgood/zeta/internal/notifications"` to the test file's import block.

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/coaching -run TestWriteBookingCancelledNotification`
Expected: FAIL — compile error `h.writeBookingCancelledNotification undefined`

- [ ] **Step 3: Implement the recorder**

In `internal/coaching/booking_email.go`, after `recordBookingCreatedNotification`:

```go
// recordBookingCancelledNotification records an in-app notification for the party
// that did NOT cancel — the same recipient rule as sendCancellationEmail. Runs
// detached from the request context.
func (h *Handler) recordBookingCancelledNotification(b db.CoachingBooking, cancelledByID string) {
	go h.writeBookingCancelledNotification(context.Background(), b, cancelledByID)
}

// writeBookingCancelledNotification is the synchronous body, split out so it can
// be unit-tested without racing the goroutine above.
func (h *Handler) writeBookingCancelledNotification(ctx context.Context, b db.CoachingBooking, cancelledByID string) {
	recipientID := b.StudentID
	if cancelledByID == b.StudentID {
		recipientID = b.ExpertID
	}

	sessionTypeName := ""
	if st, err := h.q.GetSessionType(ctx, db.GetSessionTypeParams{ID: b.SessionTypeID, GroupID: b.GroupID}); err != nil {
		h.logger.WarnContext(ctx, "booking_cancelled_notification_fetch_session_type_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
			slog.Any("err", err),
		)
	} else {
		sessionTypeName = st.Name
	}

	groupName := ""
	if group, err := h.q.GetGroup(ctx, b.GroupID); err != nil {
		h.logger.WarnContext(ctx, "booking_notification_fetch_group_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(b.ID)),
			slog.Any("err", err),
		)
	} else {
		groupName = group.Name
	}

	actor := h.resolveParticipant(ctx, cancelledByID)

	scheduledAt := ""
	if b.ScheduledAt.Valid {
		scheduledAt = b.ScheduledAt.Time.UTC().Format(time.RFC3339)
	}

	notifications.Record(ctx, h.q, h.logger, recipientID, notifications.TypeCoachingBookingCancelled,
		notifications.CoachingBookingCancelledPayload{
			BookingID:   uuidToString(b.ID),
			GroupID:     uuidToString(b.GroupID),
			GroupName:   groupName,
			ActorName:   actor.name,
			SessionName: sessionTypeName,
			ScheduledAt: scheduledAt,
		})
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/coaching -run TestWriteBookingCancelledNotification -v`
Expected: PASS, both subtests

- [ ] **Step 5: Wire it into the cancel handler**

In `internal/coaching/bookings.go`, directly below line 548 (`h.sendCancellationEmail(ctx, updated, user.ID)`):

```go
	h.recordBookingCancelledNotification(updated, user.ID)
```

- [ ] **Step 6: Verify the whole backend**

Run: `make test:unit && make api:build`
Expected: PASS, build succeeds

- [ ] **Step 7: Commit**

```bash
git add internal/coaching
git commit -m "feat(coaching): notify the other party in-app when a booking is cancelled"
```

---

### Task 3: Publish the new type in the API contract

**Files:**
- Modify: `docs/openapi.yaml:2145-2177`
- Modify: `mobile/src/api/schema.d.ts` (generated)

**Interfaces:**
- Consumes: the payload field names from Task 1.
- Produces: `actor_name` on `NotificationPayload`, so mobile's generated types allow `p.actor_name`.

- [ ] **Step 1: Add the payload field**

In `docs/openapi.yaml`, in `NotificationPayload.properties`, after the `student_name` line:

```yaml
        actor_name: { type: string }
```

- [ ] **Step 2: Extend the type description**

In `NotificationItem.type`, replace the description with:

```yaml
          description: >
            One of group_invitation_received, group_member_joined, video_reviewed,
            video_uploaded, coaching_booking_created, coaching_booking_cancelled.
```

- [ ] **Step 3: Lint the spec and regenerate the mobile client**

Run: `make api:openapi:lint`, then `cd mobile && pnpm generate:api`
Expected: lint passes; `schema.d.ts` gains `actor_name`

- [ ] **Step 4: Verify mobile still typechecks**

Run: `make mobile:typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/openapi.yaml mobile/src/api/schema.d.ts
git commit -m "docs(openapi): document coaching_booking_cancelled and actor_name"
```

---

### Task 4: Dashboard presenter — formatter, cancelled case, tab link

**Files:**
- Modify: `web/dashboard-next/src/app/features/notifications/notification-presenter.ts`
- Test: `web/dashboard-next/src/app/features/notifications/notification-presenter.spec.ts`

**Interfaces:**
- Consumes: payload fields from Task 1.
- Produces:
  - `presentNotification(item: NotificationItem, formatWhen: (iso: string) => string): NotificationPresentation`
  - `notificationLink(item: NotificationItem): { link: string; queryParams?: Record<string, string> }`
  - `sessionsTabFor(item: NotificationItem, now?: number): 'upcoming' | 'past' | 'cancelled'`

`NotificationPresentation` already carries `queryParams`, so the tab needs no new field.

- [ ] **Step 1: Write the failing tests**

In `notification-presenter.spec.ts`, replace the existing `it('links a booking to the sessions page', …)` block with:

```typescript
  const formatWhen = (iso: string) => `formatted(${iso})`;

  it('shows the appointment time and links a future booking to the upcoming tab', () => {
    const view = presentNotification(
      build({
        type: 'coaching_booking_created',
        payload: {
          student_name: 'Lena',
          session_name: 'Live coaching',
          scheduled_at: '2999-01-01T10:00:00Z',
        },
      }),
      formatWhen,
    );

    expect(view.messageKey).toBe('notifications.types.coachingBookingCreated');
    expect(view.params).toEqual({
      student: 'Lena',
      session: 'Live coaching',
      when: 'formatted(2999-01-01T10:00:00Z)',
    });
    expect(view.link).toBe('/sessions');
    expect(view.queryParams).toEqual({ tab: 'upcoming' });
    expect(view.icon).toBe('booking');
  });

  it('links a past booking to the past tab', () => {
    const view = presentNotification(
      build({
        type: 'coaching_booking_created',
        payload: { student_name: 'Lena', scheduled_at: '2020-01-01T10:00:00Z' },
      }),
      formatWhen,
    );

    expect(view.queryParams).toEqual({ tab: 'past' });
  });

  it('falls back to the upcoming tab when scheduled_at is missing', () => {
    const view = presentNotification(
      build({ type: 'coaching_booking_created', payload: { student_name: 'Lena' } }),
      formatWhen,
    );

    expect(view.params.when).toBe('');
    expect(view.queryParams).toEqual({ tab: 'upcoming' });
  });

  it('maps a cancellation to the cancelled tab and names the actor', () => {
    const view = presentNotification(
      build({
        type: 'coaching_booking_cancelled',
        payload: {
          actor_name: 'Vanessa',
          session_name: 'Live coaching',
          scheduled_at: '2999-01-01T10:00:00Z',
        },
      }),
      formatWhen,
    );

    expect(view.messageKey).toBe('notifications.types.coachingBookingCancelled');
    expect(view.params).toEqual({
      actor: 'Vanessa',
      session: 'Live coaching',
      when: 'formatted(2999-01-01T10:00:00Z)',
    });
    expect(view.link).toBe('/sessions');
    expect(view.queryParams).toEqual({ tab: 'cancelled' });
    expect(view.icon).toBe('booking');
  });
```

Every other `presentNotification(...)` call in this spec now needs the second argument. Add `, formatWhen` to each, and move the `formatWhen` const to the top of the `describe` block so all tests see it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web/dashboard-next && pnpm test -- --include='**/notification-presenter.spec.ts'`
Expected: FAIL — `presentNotification` takes 1 argument; `coaching_booking_cancelled` falls through to the generic case

- [ ] **Step 3: Implement the presenter changes**

In `notification-presenter.ts`, add above `presentNotification`:

```typescript
export type SessionsTab = 'upcoming' | 'past' | 'cancelled';

// The booking notifications deep-link to the tab that actually holds the
// booking. Linking a cancelled or already-finished session to the default
// "upcoming" tab lands the recipient on an empty list.
export function sessionsTabFor(item: NotificationItem, now = Date.now()): SessionsTab {
  if (item.type === 'coaching_booking_cancelled') return 'cancelled';
  const scheduledAt = item.payload?.scheduled_at;
  if (!scheduledAt) return 'upcoming';
  const startsAt = new Date(scheduledAt).getTime();
  if (Number.isNaN(startsAt)) return 'upcoming';
  return startsAt > now ? 'upcoming' : 'past';
}

export function notificationLink(item: NotificationItem): {
  link: string;
  queryParams?: Record<string, string>;
} {
  const view = presentNotification(item, () => '');
  return { link: view.link, queryParams: view.queryParams };
}
```

Change the signature and the two booking cases:

```typescript
export function presentNotification(
  item: NotificationItem,
  formatWhen: (iso: string) => string,
): NotificationPresentation {
  const p = item.payload ?? {};
  const when = p.scheduled_at ? formatWhen(p.scheduled_at) : '';
```

```typescript
    case 'coaching_booking_created':
      return {
        messageKey: 'notifications.types.coachingBookingCreated',
        params: { student: p.student_name ?? '', session: p.session_name ?? '', when },
        link: '/sessions',
        queryParams: { tab: sessionsTabFor(item) },
        icon: 'booking',
      };
    case 'coaching_booking_cancelled':
      return {
        messageKey: 'notifications.types.coachingBookingCancelled',
        params: { actor: p.actor_name ?? '', session: p.session_name ?? '', when },
        link: '/sessions',
        queryParams: { tab: sessionsTabFor(item) },
        icon: 'booking',
      };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web/dashboard-next && pnpm test -- --include='**/notification-presenter.spec.ts'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/dashboard-next/src/app/features/notifications/notification-presenter.ts web/dashboard-next/src/app/features/notifications/notification-presenter.spec.ts
git commit -m "feat(notifications): show appointment time and target the right sessions tab"
```

---

### Task 5: Dashboard call sites and copy

**Files:**
- Modify: `web/dashboard-next/src/app/features/notifications/notification-list.component.ts:176-178`
- Modify: `web/dashboard-next/src/app/core/shell/shell.component.ts:231-233`
- Modify: `web/dashboard-next/src/app/pages/notifications/notifications-page.component.ts:136-140`
- Modify: `web/dashboard-next/public/i18n/{de,en,fr}.json` under `notifications.types`

**Interfaces:**
- Consumes: `presentNotification(item, formatWhen)` and `notificationLink(item)` from Task 4.
- Produces: nothing downstream.

- [ ] **Step 1: Add the copy to all three locale files**

`de.json` — replace `coachingBookingCreated` and add the new key after it:

```json
      "coachingBookingCreated": "{{student}} hat einen Termin mit dir gebucht — {{when}}",
      "coachingBookingCancelled": "{{actor}} hat den Termin am {{when}} abgesagt",
```

`en.json`:

```json
      "coachingBookingCreated": "{{student}} booked a session with you — {{when}}",
      "coachingBookingCancelled": "{{actor}} cancelled the session on {{when}}",
```

`fr.json`:

```json
      "coachingBookingCreated": "{{student}} a réservé une séance avec vous — {{when}}",
      "coachingBookingCancelled": "{{actor}} a annulé la séance du {{when}}",
```

- [ ] **Step 2: Update `notification-list.component.ts`**

Add the import and inject the service, then pass the formatter. The options match `sessions-page.component.ts:322-330` so the notification and the sessions list render the time identically:

```typescript
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
```

```typescript
  private readonly dateTime = inject(DashboardDateTimeService);

  protected present(item: NotificationItem) {
    return presentNotification(item, (iso) =>
      this.dateTime.formatInstantDateTime(iso, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  }
```

This file's `@angular/core` import is `{ Component, input, output }` — add `inject` to it.

- [ ] **Step 3: Update `shell.component.ts` the same way**

Apply the identical `dateTime` field and `present` body as in Step 2, with the import path `../i18n/dashboard-date-time.service`. This file already imports `inject`, so only the service import is new.

- [ ] **Step 4: Update `notifications-page.component.ts`**

This component calls `presentNotification` only inside `onOpen` (line 138) and never for message text, so it swaps to `notificationLink` and drops the old import entirely:

```typescript
import { notificationLink } from '../../features/notifications/notification-presenter';
```

```typescript
  protected onOpen(item: NotificationItem): void {
    void this.store.markRead(item.id);
    const target = notificationLink(item);
    void this.router.navigate([target.link], { queryParams: target.queryParams });
  }
```

- [ ] **Step 5: Verify the dashboard**

Run: `make web-next:test && make web-next:lint && make web-next:build`
Expected: PASS on all three

- [ ] **Step 6: Commit**

```bash
git add web/dashboard-next/src web/dashboard-next/public/i18n
git commit -m "feat(dashboard): render appointment time in booking notifications"
```

---

### Task 6: Mobile presenter, formatter, and copy

**Files:**
- Modify: `mobile/src/lib/notification-presenter.ts`
- Modify: `mobile/src/lib/datetime.ts`
- Modify: `mobile/src/i18n/locales/{de,en,fr}.json:768`
- Test: `mobile/src/lib/notification-presenter.test.ts`

**Interfaces:**
- Consumes: payload fields from Task 1, `actor_name` from Task 3.
- Produces:
  - `presentNotification(item: NotificationItem, formatWhen: (iso: string) => string): NotificationPresentation`
  - `notificationHref(item: NotificationItem): Href`
  - `formatDateTime(iso: string): string` in `lib/datetime.ts`

- [ ] **Step 1: Write the failing tests**

Replace the existing `coaching_booking_created` test in `notification-presenter.test.ts` and add the cancellation test:

```typescript
const formatWhen = (iso: string) => `formatted(${iso})`;

test('coaching_booking_created shows the time and targets the upcoming tab', () => {
  const v = presentNotification(
    make({
      type: 'coaching_booking_created',
      payload: { student_name: 'Lena', session_name: 'Live coaching', scheduled_at: '2999-01-01T10:00:00Z' },
    }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.coachingBookingCreated');
  expect(v.params).toEqual({
    student: 'Lena',
    session: 'Live coaching',
    when: 'formatted(2999-01-01T10:00:00Z)',
  });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'upcoming' } });
  expect(v.icon).toBe('booking');
});

test('coaching_booking_created for a past session targets the past tab', () => {
  const v = presentNotification(
    make({ type: 'coaching_booking_created', payload: { scheduled_at: '2020-01-01T10:00:00Z' } }),
    formatWhen,
  );
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'past' } });
});

test('coaching_booking_cancelled names the actor and targets the cancelled tab', () => {
  const v = presentNotification(
    make({
      type: 'coaching_booking_cancelled',
      payload: { actor_name: 'Vanessa', scheduled_at: '2999-01-01T10:00:00Z' },
    }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.coachingBookingCancelled');
  expect(v.params).toEqual({ actor: 'Vanessa', session: '', when: 'formatted(2999-01-01T10:00:00Z)' });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'cancelled' } });
});

test('notificationHref returns the target without a formatter', () => {
  const href = notificationHref(make({ type: 'coaching_booking_cancelled', payload: {} }));
  expect(href).toEqual({ pathname: '/coaching', params: { tab: 'cancelled' } });
});
```

Add `, formatWhen` to every other `presentNotification(...)` call in this file, and import `notificationHref` alongside `presentNotification`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd mobile && pnpm test src/lib/notification-presenter.test.ts`
Expected: FAIL — wrong arity, `notificationHref` not exported, cancellation hits the generic branch

- [ ] **Step 3: Add the mobile date formatter**

In `mobile/src/lib/datetime.ts`, after `formatDate`:

```typescript
/** Locale-aware absolute date + time for notification copy. Empty on invalid input. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(appLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

- [ ] **Step 4: Implement the presenter changes**

In `mobile/src/lib/notification-presenter.ts`, mirror Task 4 — add `SessionTab`, `sessionsTabFor`, and `notificationHref`, change the signature to take `formatWhen`, compute `when`, and replace the booking case:

Note the exported name is `SessionsTab`, not `SessionTab` — `mobile/src/app/(tabs)/coaching/index.tsx:24` already declares a local `SessionTab`, and matching names across the two files would be confusing to read even though they never collide in one scope.

```typescript
export type SessionsTab = 'upcoming' | 'past' | 'cancelled';

// Mirrors the web presenter: link to the tab that actually holds the booking.
export function sessionsTabFor(item: NotificationItem, now = Date.now()): SessionsTab {
  if (item.type === 'coaching_booking_cancelled') return 'cancelled';
  const scheduledAt = item.payload?.scheduled_at;
  if (!scheduledAt) return 'upcoming';
  const startsAt = new Date(scheduledAt).getTime();
  if (Number.isNaN(startsAt)) return 'upcoming';
  return startsAt > now ? 'upcoming' : 'past';
}

export function notificationHref(item: NotificationItem): Href {
  return presentNotification(item, () => '').href;
}
```

```typescript
    case 'coaching_booking_created':
      return {
        messageKey: 'notifications.types.coachingBookingCreated',
        params: { student: p.student_name ?? '', session: p.session_name ?? '', when },
        href: { pathname: '/coaching', params: { tab: sessionsTabFor(item) } } as Href,
        icon: 'booking',
      };
    case 'coaching_booking_cancelled':
      return {
        messageKey: 'notifications.types.coachingBookingCancelled',
        params: { actor: p.actor_name ?? '', session: p.session_name ?? '', when },
        href: { pathname: '/coaching', params: { tab: sessionsTabFor(item) } } as Href,
        icon: 'booking',
      };
```

- [ ] **Step 5: Add the copy to all three mobile locale files**

Use exactly the strings from Task 5, Step 1, at `notifications.types` in `mobile/src/i18n/locales/{de,en,fr}.json`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd mobile && pnpm test src/lib/notification-presenter.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add mobile/src/lib mobile/src/i18n
git commit -m "feat(mobile): present booking cancellations and appointment times"
```

---

### Task 7: Mobile call sites and the deep-linked tab

**Files:**
- Modify: `mobile/src/components/notification-row.tsx:87`
- Modify: `mobile/src/app/notifications.tsx:26,80`
- Modify: `mobile/src/app/(tabs)/coaching/index.tsx:65`
- Test: `mobile/src/components/notification-row.test.tsx`

**Interfaces:**
- Consumes: `presentNotification(item, formatWhen)`, `notificationHref(item)`, `formatDateTime` from Task 6.
- Produces: nothing downstream.

- [ ] **Step 1: Pass the formatter in `notification-row.tsx`**

```typescript
import { formatDateTime } from '../lib/datetime';
```

```typescript
  const view = presentNotification(item, formatDateTime);
```

- [ ] **Step 2: Use the href helper in `notifications.tsx`**

Change the import on line 26 to bring in `notificationHref` alongside `presentNotification` and `resolvedInvite`, then:

```typescript
    router.push(notificationHref(item) as never);
```

If `presentNotification` is no longer referenced in this file, drop it from the import.

- [ ] **Step 3: Write the failing test for the rendered time**

`notificationHref` is already covered as a pure function in Task 6. What is untested here is that the row actually feeds the formatter through to the copy. Add to `mobile/src/components/notification-row.test.tsx`:

```typescript
test('a booking notification renders the formatted appointment time', async () => {
  const item = make({
    id: 'n-booking',
    type: 'coaching_booking_created',
    payload: { student_name: 'Lena', scheduled_at: '2026-08-21T12:15:00Z' },
    read: true,
  });
  const { toJSON } = await render(
    <NotificationRow item={item} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );

  // The t() mock echoes interpolation params as JSON, so the formatted time is
  // observable without depending on the emulator's locale.
  expect(JSON.stringify(toJSON())).toMatch(/"when\\":\\"[^"\\]+/);
});
```

- [ ] **Step 4: Run it to verify it fails, then passes**

Run: `cd mobile && pnpm test src/components/notification-row.test.tsx`
Expected: FAIL before Step 1 (`when` is absent from the params), PASS after

- [ ] **Step 5: Honour the tab param in the coaching screen**

In `mobile/src/app/(tabs)/coaching/index.tsx`, replace the hardcoded initial state on line 65:

```typescript
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<SessionTab>(
    tab === 'past' || tab === 'cancelled' ? tab : 'upcoming',
  );
```

Import `useLocalSearchParams` from `expo-router` in this file's existing expo-router import.

- [ ] **Step 6: Verify mobile end to end**

Run: `make mobile:test && make mobile:lint && make mobile:typecheck`
Expected: PASS on all three

- [ ] **Step 7: Capture the emulator screenshots**

Launch the app, open the notification list, and tap a booking notification. Capture the notification list and the coaching screen it lands on. AGENTS.md requires these in the PR description for mobile UI changes.

- [ ] **Step 8: Commit**

```bash
git add mobile/src
git commit -m "feat(mobile): deep-link booking notifications to the matching tab"
```

---

## Final verification

- [ ] `make test:unit`
- [ ] `make api:build`
- [ ] `make web-next:test`, `make web-next:lint`, `make web-next:build`
- [ ] `make mobile:test`, `make mobile:lint`, `make mobile:typecheck`
- [ ] `make api:openapi:lint`
- [ ] `git diff --check`
- [ ] Write the completion report to `.agents/reports/`, per AGENTS.md
