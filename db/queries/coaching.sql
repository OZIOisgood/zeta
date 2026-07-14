-- === Timezone ===

-- name: GetUserTimezone :one
SELECT timezone FROM user_preferences WHERE user_id = $1;

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

-- name: GetBookingForRecordingUpdate :one
SELECT * FROM coaching_bookings
WHERE id = $1 AND (expert_id = $2 OR student_id = $2)
FOR UPDATE;

-- name: GetBookingRecordingForUpdate :one
SELECT * FROM coaching_booking_recordings
WHERE booking_id = $1
FOR UPDATE;

-- name: GetBookingRecording :one
SELECT * FROM coaching_booking_recordings
WHERE booking_id = $1;

-- name: MarkBookingRecordingStarted :one
INSERT INTO coaching_booking_recordings (
    booking_id,
    status,
    resource_id,
    sid,
    uid,
    file_prefix,
    started_at,
    stopped_at,
    error
)
VALUES ($1, 'started', $2, $3, $4, $5, NOW(), NULL, NULL)
ON CONFLICT (booking_id) DO UPDATE SET
    status = 'started',
    resource_id = EXCLUDED.resource_id,
    sid = EXCLUDED.sid,
    uid = EXCLUDED.uid,
    file_prefix = EXCLUDED.file_prefix,
    started_at = NOW(),
    stopped_at = NULL,
    error = NULL,
    updated_at = NOW()
RETURNING *;

-- name: MarkBookingRecordingFailed :exec
INSERT INTO coaching_booking_recordings (booking_id, status, error)
VALUES ($1, 'failed', $2)
ON CONFLICT (booking_id) DO UPDATE SET
    status = 'failed',
    error = EXCLUDED.error,
    updated_at = NOW();

-- name: MarkBookingRecordingStopping :one
UPDATE coaching_booking_recordings
SET status = 'stopping',
    updated_at = NOW()
WHERE booking_id = $1
  AND status IN ('starting', 'started')
RETURNING *;

-- name: MarkBookingRecordingStopped :one
UPDATE coaching_booking_recordings
SET status = 'stopped',
    stopped_at = NOW(),
    error = NULL,
    updated_at = NOW()
WHERE booking_id = $1
RETURNING *;

-- name: EnsureRecordingImportPending :one
INSERT INTO coaching_recording_imports (booking_id, status, error)
VALUES ($1, 'pending', NULL)
ON CONFLICT (booking_id) DO UPDATE SET
    status = CASE
        WHEN coaching_recording_imports.status = 'ready' THEN coaching_recording_imports.status
        ELSE 'pending'
    END,
    error = NULL,
    updated_at = NOW()
RETURNING *;

-- name: CreateMissingRecordingImports :execrows
INSERT INTO coaching_recording_imports (booking_id, status)
SELECT r.booking_id, 'pending'
FROM coaching_booking_recordings r
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = r.booking_id
WHERE r.status = 'stopped'
  AND ri.booking_id IS NULL
ON CONFLICT (booking_id) DO NOTHING;

-- name: ListPendingRecordingImports :many
SELECT
    ri.*,
    r.file_prefix,
    b.student_id,
    b.group_id,
    b.scheduled_at,
    b.duration_minutes,
    cst.name AS session_type_name
FROM coaching_recording_imports ri
JOIN coaching_booking_recordings r ON r.booking_id = ri.booking_id
JOIN coaching_bookings b ON b.id = ri.booking_id
JOIN coaching_session_types cst ON cst.id = b.session_type_id
WHERE r.status = 'stopped'
  AND ri.status IN ('pending', 'processing', 'failed')
  AND ri.attempts < 5
  AND (
    ri.last_attempt_at IS NULL
    OR ri.last_attempt_at <= NOW() - interval '1 minute'
  )
ORDER BY ri.created_at
LIMIT $1;

-- name: MarkRecordingImportImporting :one
UPDATE coaching_recording_imports
SET status = 'importing',
    attempts = attempts + 1,
    last_attempt_at = NOW(),
    error = NULL,
    updated_at = NOW()
WHERE booking_id = $1
  AND status IN ('pending', 'processing', 'failed')
RETURNING *;

-- name: MarkRecordingImportMuxCreated :one
UPDATE coaching_recording_imports
SET status = 'processing',
    gcs_object_name = $2,
    mux_asset_id = $3,
    mux_playback_id = $4,
    error = NULL,
    updated_at = NOW()
WHERE booking_id = $1
RETURNING *;

-- name: MarkRecordingImportReady :one
UPDATE coaching_recording_imports
SET status = 'ready',
    gcs_object_name = $2,
    mux_asset_id = $3,
    mux_playback_id = $4,
    asset_id = $5,
    video_id = $6,
    imported_at = NOW(),
    error = NULL,
    updated_at = NOW()
WHERE booking_id = $1
RETURNING *;

-- name: MarkRecordingImportFailed :exec
UPDATE coaching_recording_imports
SET status = 'failed',
    error = $2,
    updated_at = NOW()
WHERE booking_id = $1;

-- name: ListRecordingsPastEnd :many
SELECT r.*
FROM coaching_booking_recordings r
JOIN coaching_bookings b ON b.id = r.booking_id
WHERE r.status IN ('starting', 'started', 'stopping')
  AND b.scheduled_at + (b.duration_minutes * interval '1 minute') + (sqlc.arg(grace_seconds)::int * interval '1 second') <= NOW()
ORDER BY b.scheduled_at
LIMIT sqlc.arg(limit_count);

-- name: ListMyBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(ri.status::text, r.status::text, '')::varchar AS recording_status,
       ri.asset_id AS recording_asset_id,
       ri.video_id AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
WHERE (cb.expert_id = $1 OR cb.student_id = $1) AND cb.group_id = $2
ORDER BY cb.scheduled_at DESC;

-- name: ListGroupBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(ri.status::text, r.status::text, '')::varchar AS recording_status,
       ri.asset_id AS recording_asset_id,
       ri.video_id AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
WHERE cb.group_id = $1
ORDER BY cb.scheduled_at;

-- name: ListAllMyBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(ri.status::text, r.status::text, '')::varchar AS recording_status,
       ri.asset_id AS recording_asset_id,
       ri.video_id AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
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

-- name: EndBooking :one
UPDATE coaching_bookings
SET ended_at = NOW(),
    ended_by = $2,
    updated_at = NOW()
WHERE id = $1
  AND expert_id = $2
  AND is_cancelled = false
  AND ended_at IS NULL
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
       b.expert_id, b.student_id, b.group_id, b.scheduled_at, b.duration_minutes, b.is_cancelled
FROM coaching_booking_reminders r
JOIN coaching_bookings b ON b.id = r.booking_id
WHERE r.sent_at IS NULL
  AND r.remind_at <= NOW()
ORDER BY r.remind_at
LIMIT 100;

-- name: MarkReminderSent :exec
UPDATE coaching_booking_reminders SET sent_at = NOW() WHERE id = $1;
