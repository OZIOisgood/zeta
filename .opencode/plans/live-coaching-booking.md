# Live Coaching Booking System - Backend Implementation Plan

## Overview
Add a live coaching booking system to the Zeta API. Experts configure their availability and session types, students browse available slots and book coaching sessions.

**Branch:** `feat/live-coaching-booking` (existing branch with substantial WIP code)
**Approach:** Modify existing code to add session types, remove slot_duration from availability, update all dependent code.

---

## Iteration 1: Database Schema

### 1.1 Edit Migration `db/migrations/20260403000001_create_coaching_tables.up.sql`

Replace the entire file with:

```sql
CREATE TYPE coaching_booking_status AS ENUM (
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);

ALTER TABLE user_preferences ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';

CREATE TABLE coaching_session_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 120),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_session_types_expert_group ON coaching_session_types(expert_id, group_id);

CREATE TABLE coaching_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_availability_expert_group ON coaching_availability(expert_id, group_id);

CREATE TABLE coaching_blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    blocked_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_blocked_slots_expert ON coaching_blocked_slots(expert_id, blocked_date);

CREATE TABLE coaching_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    session_type_id UUID NOT NULL REFERENCES coaching_session_types(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status coaching_booking_status NOT NULL DEFAULT 'confirmed',
    cancellation_reason TEXT,
    cancelled_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_bookings_expert ON coaching_bookings(expert_id, scheduled_at);
CREATE INDEX idx_coaching_bookings_student ON coaching_bookings(student_id, scheduled_at);
CREATE INDEX idx_coaching_bookings_group ON coaching_bookings(group_id, scheduled_at);
```

**Key changes from existing:**
- Added `coaching_session_types` table
- Removed `slot_duration_minutes` from `coaching_availability`
- Added `session_type_id` FK to `coaching_bookings`

### 1.2 Edit Migration `db/migrations/20260403000001_create_coaching_tables.down.sql`

```sql
DROP TABLE IF EXISTS coaching_bookings;
DROP TABLE IF EXISTS coaching_blocked_slots;
DROP TABLE IF EXISTS coaching_availability;
DROP TABLE IF EXISTS coaching_session_types;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS timezone;
DROP TYPE IF EXISTS coaching_booking_status;
```

### 1.3 Edit SQL Queries `db/queries/coaching.sql`

Replace with updated queries that:
- Add session type CRUD queries (Create, List by expert+group, List by group, Update, Delete, Get)
- Remove `slot_duration_minutes` from availability queries
- Add `session_type_id` to booking creation
- Keep timezone, blocked slots, and booking queries mostly intact

```sql
-- === Timezone ===

-- name: GetUserTimezone :one
SELECT timezone FROM user_preferences WHERE user_id = $1;

-- name: UpsertUserTimezone :exec
INSERT INTO user_preferences (user_id, timezone)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = NOW();

-- === Session Types ===

-- name: CreateSessionType :one
INSERT INTO coaching_session_types (expert_id, group_id, name, description, duration_minutes)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListSessionTypesByExpertGroup :many
SELECT * FROM coaching_session_types
WHERE expert_id = $1 AND group_id = $2 AND is_active = true
ORDER BY duration_minutes;

-- name: ListSessionTypesByGroup :many
SELECT * FROM coaching_session_types
WHERE group_id = $1 AND is_active = true
ORDER BY expert_id, duration_minutes;

-- name: GetSessionType :one
SELECT * FROM coaching_session_types WHERE id = $1;

-- name: UpdateSessionType :one
UPDATE coaching_session_types
SET name = $2, description = $3, duration_minutes = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeactivateSessionType :exec
UPDATE coaching_session_types
SET is_active = false, updated_at = NOW()
WHERE id = $1 AND expert_id = $2;

-- === Availability ===

-- name: CreateAvailability :one
INSERT INTO coaching_availability (expert_id, group_id, day_of_week, start_time, end_time)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListAvailabilityByExpertGroup :many
SELECT * FROM coaching_availability
WHERE expert_id = $1 AND group_id = $2 AND is_active = true
ORDER BY day_of_week, start_time;

-- name: ListActiveExpertsInGroup :many
SELECT DISTINCT expert_id FROM coaching_availability
WHERE group_id = $1 AND is_active = true;

-- name: UpdateAvailability :one
UPDATE coaching_availability
SET day_of_week = $2, start_time = $3, end_time = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteAvailability :exec
DELETE FROM coaching_availability WHERE id = $1 AND expert_id = $2;

-- name: ListAvailabilityByGroup :many
SELECT * FROM coaching_availability
WHERE group_id = $1 AND is_active = true
ORDER BY expert_id, day_of_week, start_time;

-- === Blocked Slots ===

-- name: CreateBlockedSlot :one
INSERT INTO coaching_blocked_slots (expert_id, blocked_date, start_time, end_time, reason)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListBlockedSlots :many
SELECT * FROM coaching_blocked_slots
WHERE expert_id = $1 AND blocked_date >= @from_date AND blocked_date <= @to_date
ORDER BY blocked_date, start_time;

-- name: DeleteBlockedSlot :exec
DELETE FROM coaching_blocked_slots WHERE id = $1 AND expert_id = $2;

-- === Bookings ===

-- name: ListBookingsByExpertInRange :many
SELECT * FROM coaching_bookings
WHERE expert_id = $1
  AND scheduled_at >= $2
  AND scheduled_at < $3
  AND status != 'cancelled'
ORDER BY scheduled_at;

-- name: CreateBooking :one
INSERT INTO coaching_bookings (expert_id, student_id, group_id, session_type_id, scheduled_at, duration_minutes, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetBooking :one
SELECT * FROM coaching_bookings WHERE id = $1;

-- name: ListMyBookings :many
SELECT cb.*, cst.name AS session_type_name
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE cb.expert_id = $1 OR cb.student_id = $1
ORDER BY cb.scheduled_at DESC;

-- name: ListGroupBookings :many
SELECT cb.*, cst.name AS session_type_name
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE cb.group_id = $1 AND cb.status = 'confirmed'
ORDER BY cb.scheduled_at;

-- name: UpdateBookingStatus :one
UPDATE coaching_bookings
SET status = $2,
    cancellation_reason = CASE WHEN $2 = 'cancelled' THEN $3 ELSE cancellation_reason END,
    cancelled_by = CASE WHEN $2 = 'cancelled' THEN $4 ELSE cancelled_by END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CountConflictingBookings :one
SELECT COUNT(*) FROM coaching_bookings
WHERE expert_id = $1
  AND status != 'cancelled'
  AND scheduled_at < $3
  AND scheduled_at + (duration_minutes * interval '1 minute') > $2;
```

### 1.4 Run sqlc generate and build

```bash
make db:sqlc
make api:build
```

### 1.5 Update permissions `internal/permissions/permissions.go`

No changes needed - existing coaching permissions are sufficient.

---

## Iteration 2: Session Types CRUD

### 2.1 Update Handler - Add Session Type routes

In `internal/coaching/handler.go`, add to `RegisterRoutes`:

```go
// Session types management (experts)
r.Get("/session-types", h.ListSessionTypes)
r.Post("/session-types", h.CreateSessionType)
r.Put("/session-types/{typeID}", h.UpdateSessionType)
r.Delete("/session-types/{typeID}", h.DeleteSessionType)
```

### 2.2 Implement Session Type handlers

Add these handler methods:
- `CreateSessionType` - validates name (3-50 chars), duration (15-120), creates via sqlc
- `ListSessionTypes` - lists active session types for expert+group (expert) or group (student)
- `UpdateSessionType` - updates name, description, duration
- `DeleteSessionType` - soft-deletes (deactivates) via DeactivateSessionType query

### 2.3 Add response DTO

```go
type sessionTypeResponse struct {
    ID              string    `json:"id"`
    ExpertID        string    `json:"expert_id"`
    GroupID         string    `json:"group_id"`
    Name            string    `json:"name"`
    Description     string    `json:"description"`
    DurationMinutes int32     `json:"duration_minutes"`
    IsActive        bool      `json:"is_active"`
    CreatedAt       time.Time `json:"created_at"`
}
```

### 2.4 Bruno Tests

Create `bruno/coaching/session-types/` with:
- `folder.bru` (pre-request auth script)
- `create-session-type.bru` - POST, stores sessionTypeId
- `list-session-types.bru` - GET, verify count > 0
- `update-session-type.bru` - PUT
- `delete-session-type.bru` - DELETE

---

## Iteration 3: Availability Management

### 3.1 Update Availability handlers

Remove all `slot_duration_minutes` references from:
- `CreateAvailabilityRequest` struct
- `CreateAvailability` handler
- `UpdateAvailability` handler
- `availabilityResponse` struct
- `toAvailabilityResponse` function

The availability now only defines time windows (day_of_week, start_time, end_time).

### 3.2 Bruno Tests

Create `bruno/coaching/availability/` with:
- `folder.bru`
- `create-availability.bru` - POST, stores availabilityId
- `list-availability.bru` - GET
- `update-availability.bru` - PUT
- `delete-availability.bru` - DELETE

Create `bruno/coaching/timezone/` with:
- `get-timezone.bru` - GET
- `set-timezone.bru` - PUT

---

## Iteration 4: Blocked Slots

### 4.1 Handlers already exist

The blocked slots handlers are already implemented and only need minor cleanup.

### 4.2 Bruno Tests

Create `bruno/coaching/blocked-slots/` with:
- `folder.bru`
- `create-blocked-slot.bru` - POST full day block
- `create-blocked-slot-partial.bru` - POST partial day block
- `list-blocked-slots.bru` - GET
- `delete-blocked-slot.bru` - DELETE

---

## Iteration 5: Slot Computation & Expert Listing

### 5.1 Update Slot Computation

Modify `ListAvailableSlots` to accept `session_type_id` query param instead of getting duration from availability:
1. Look up the session type by ID to get `duration_minutes`
2. Use that duration as the slot step size when iterating over availability windows
3. The rest of the logic (blocked slots, bookings filter) stays the same

Update `computeSlots` function signature to accept `durationMinutes int32` parameter instead of reading `a.SlotDurationMinutes`.

### 5.2 Update `SlotResponse` to include session type info

```go
type SlotResponse struct {
    ExpertID        string    `json:"expert_id"`
    SessionTypeID   string    `json:"session_type_id"`
    SessionTypeName string    `json:"session_type_name"`
    StartsAt        time.Time `json:"starts_at"`
    EndsAt          time.Time `json:"ends_at"`
    DurationMinutes int32     `json:"duration_minutes"`
}
```

### 5.3 Bruno Tests

Create `bruno/coaching/slots/` with:
- `list-experts.bru` - GET experts in group
- `list-available-slots.bru` - GET slots for expert + session type

---

## Iteration 6: Bookings

### 6.1 Update Booking handlers

Modify `CreateBookingRequest` to include `session_type_id`:
```go
type CreateBookingRequest struct {
    ExpertID      string  `json:"expert_id"`
    SessionTypeID string  `json:"session_type_id"`
    ScheduledAt   string  `json:"scheduled_at"`
    Notes         *string `json:"notes,omitempty"`
}
```

The `duration_minutes` is now derived from the session type, not from the request body.

Update `CreateBooking` handler:
1. Look up session type to get duration
2. Validate session type belongs to the expert+group
3. Create booking with session_type_id

Update `bookingResponse` to include session type name.

Update `ListMyBookings` and `ListGroupBookings` to use the new queries that JOIN session types.

### 6.2 Bruno Tests

Create `bruno/coaching/bookings/` with:
- `folder.bru`
- `create-booking.bru` - POST, stores bookingId
- `list-my-bookings.bru` - GET /coaching/bookings
- `list-group-sessions.bru` - GET /groups/{groupID}/coaching/sessions
- `cancel-booking.bru` - PUT status=cancelled
- `create-duplicate-booking.bru` - POST same slot, expect 409 Conflict

---

## Verification Steps (after each iteration)

1. `make db:sqlc` - regenerate Go code from SQL
2. `make api:build` - verify compilation
3. Run Bruno tests against local dev server

---

## API Endpoint Summary

### Session Types (Expert only)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/groups/{groupID}/coaching/session-types` | Create session type |
| GET | `/groups/{groupID}/coaching/session-types` | List session types |
| PUT | `/groups/{groupID}/coaching/session-types/{typeID}` | Update session type |
| DELETE | `/groups/{groupID}/coaching/session-types/{typeID}` | Deactivate session type |

### Availability (Expert only)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/groups/{groupID}/coaching/availability` | Create availability window |
| GET | `/groups/{groupID}/coaching/availability` | List my availability |
| PUT | `/groups/{groupID}/coaching/availability/{id}` | Update availability |
| DELETE | `/groups/{groupID}/coaching/availability/{id}` | Delete availability |

### Blocked Slots (Expert only)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/groups/{groupID}/coaching/blocked-slots` | Create blocked slot |
| GET | `/groups/{groupID}/coaching/blocked-slots` | List blocked slots |
| DELETE | `/groups/{groupID}/coaching/blocked-slots/{id}` | Delete blocked slot |

### Slots & Experts (All authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/groups/{groupID}/coaching/experts` | List experts with availability |
| GET | `/groups/{groupID}/coaching/slots?expert_id=X&session_type_id=Y` | Compute available slots |

### Bookings (Role-dependent)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/groups/{groupID}/coaching/bookings` | Book a session (student) |
| GET | `/groups/{groupID}/coaching/sessions` | List group's bookings |
| GET | `/coaching/bookings` | List my bookings (cross-group) |
| PUT | `/coaching/bookings/{id}/status` | Cancel/complete booking |

### Timezone (All authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/coaching/timezone` | Get my timezone |
| PUT | `/coaching/timezone` | Set my timezone |
