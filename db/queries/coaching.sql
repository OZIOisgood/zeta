-- name: GetUserTimezone :one
SELECT timezone FROM user_preferences WHERE user_id = $1;

-- name: UpsertUserTimezone :exec
INSERT INTO user_preferences (user_id, timezone)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = NOW();

-- name: CreateAvailability :one
INSERT INTO coaching_availability (expert_id, group_id, day_of_week, start_time, end_time, slot_duration_minutes)
VALUES ($1, $2, $3, $4, $5, $6)
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
SET day_of_week = $2, start_time = $3, end_time = $4, slot_duration_minutes = $5, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteAvailability :exec
DELETE FROM coaching_availability WHERE id = $1 AND expert_id = $2;

-- name: ListAvailabilityByGroup :many
SELECT * FROM coaching_availability
WHERE group_id = $1 AND is_active = true
ORDER BY expert_id, day_of_week, start_time;

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

-- name: ListBookingsByExpertInRange :many
SELECT * FROM coaching_bookings
WHERE expert_id = $1
  AND scheduled_at >= $2
  AND scheduled_at < $3
  AND status != 'cancelled'
ORDER BY scheduled_at;

-- name: CreateBooking :one
INSERT INTO coaching_bookings (expert_id, student_id, group_id, scheduled_at, duration_minutes, notes)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetBooking :one
SELECT * FROM coaching_bookings WHERE id = $1;

-- name: ListMyBookings :many
SELECT * FROM coaching_bookings
WHERE expert_id = $1 OR student_id = $1
ORDER BY scheduled_at DESC;

-- name: ListGroupBookings :many
SELECT * FROM coaching_bookings
WHERE group_id = $1 AND status = 'confirmed'
ORDER BY scheduled_at;

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
