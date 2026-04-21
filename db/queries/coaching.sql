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
SELECT * FROM coaching_session_types WHERE id = $1 AND group_id = $2;

-- name: UpdateSessionType :one
UPDATE coaching_session_types
SET name = $2, description = $3, duration_minutes = $4, updated_at = NOW()
WHERE id = $1 AND expert_id = $5 AND group_id = $6
RETURNING *;

-- name: DeactivateSessionType :execrows
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
WHERE id = $1 AND expert_id = $5 AND group_id = $6
RETURNING *;

-- name: ListAvailabilityByExpertGroupDay :many
SELECT * FROM coaching_availability
WHERE expert_id = $1 AND group_id = $2 AND day_of_week = $3 AND is_active = true
ORDER BY start_time;

-- name: DeleteAvailability :execrows
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

-- name: DeleteBlockedSlot :execrows
DELETE FROM coaching_blocked_slots WHERE id = $1 AND expert_id = $2;

-- === Bookings ===

-- name: ListBookingsByExpertInRange :many
SELECT * FROM coaching_bookings
WHERE expert_id = $1
  AND scheduled_at >= $2
  AND scheduled_at < $3
  AND is_cancelled = false
ORDER BY scheduled_at;

-- name: CreateBooking :one
INSERT INTO coaching_bookings (expert_id, student_id, group_id, session_type_id, scheduled_at, duration_minutes, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetBooking :one
SELECT * FROM coaching_bookings WHERE id = $1 AND (expert_id = $2 OR student_id = $2);

-- name: ListMyBookings :many
SELECT cb.*, cst.name AS session_type_name
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE (cb.expert_id = $1 OR cb.student_id = $1) AND cb.group_id = $2
ORDER BY cb.scheduled_at DESC;

-- name: ListGroupBookings :many
SELECT cb.*, cst.name AS session_type_name
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE cb.group_id = $1
ORDER BY cb.scheduled_at;

-- name: ListAllMyBookings :many
SELECT cb.*, cst.name AS session_type_name
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE cb.expert_id = $1 OR cb.student_id = $1
ORDER BY cb.scheduled_at ASC;

-- name: CancelBooking :one
UPDATE coaching_bookings
SET is_cancelled = true,
    cancellation_reason = $2,
    cancelled_by = $3,
    updated_at = NOW()
WHERE id = $1 AND (expert_id = $4 OR student_id = $4)
RETURNING *;

-- name: CountConflictingBookings :one
SELECT COUNT(*) FROM coaching_bookings
WHERE expert_id = $1
  AND is_cancelled = false
  AND scheduled_at < $3
  AND scheduled_at + (duration_minutes * interval '1 minute') > $2;

-- === Booking Reminders ===

-- name: CreateBookingReminder :exec
INSERT INTO coaching_booking_reminders (booking_id, remind_at)
VALUES ($1, $2);

-- name: ListPendingReminders :many
SELECT r.id, r.booking_id, r.remind_at,
       b.expert_id, b.student_id, b.scheduled_at, b.duration_minutes, b.is_cancelled
FROM coaching_booking_reminders r
JOIN coaching_bookings b ON b.id = r.booking_id
WHERE r.sent_at IS NULL
  AND r.remind_at <= NOW()
ORDER BY r.remind_at
LIMIT 100;

-- name: MarkReminderSent :exec
UPDATE coaching_booking_reminders SET sent_at = NOW() WHERE id = $1;
