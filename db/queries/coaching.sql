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

-- === Simple recording parts ===

-- name: ClaimNextRecordingPart :one
WITH claimed_booking AS (
    UPDATE coaching_bookings booking
    SET next_recording_part_number = next_recording_part_number + 1,
        updated_at = NOW()
    WHERE booking.id = sqlc.arg(booking_id)
      AND NOT EXISTS (
          SELECT 1 FROM coaching_booking_recordings recording
          WHERE recording.booking_id = booking.id
            AND recording.status IN ('starting', 'started', 'stopping')
      )
      AND NOT EXISTS (
          SELECT 1 FROM coaching_booking_recordings failed
          WHERE failed.booking_id = booking.id
            AND failed.status = 'failed'
            AND failed.updated_at > NOW() - interval '30 seconds'
      )
    RETURNING booking.id, booking.next_recording_part_number - 1 AS part_number
)
INSERT INTO coaching_booking_recordings (
    booking_id, part_number, provider, provider_uid,
    renderer_token_hash, renderer_token_expires_at
)
SELECT id, part_number, sqlc.arg(provider), sqlc.arg(provider_uid),
       sqlc.arg(renderer_token_hash), sqlc.arg(renderer_token_expires_at)
FROM claimed_booking
RETURNING *;

-- name: GetActiveRecordingPart :one
SELECT * FROM coaching_booking_recordings
WHERE booking_id = $1 AND status IN ('starting', 'started', 'stopping')
ORDER BY part_number DESC
LIMIT 1;

-- name: SetRecordingPartProviderStarted :one
UPDATE coaching_booking_recordings
SET provider_resource_id = $2,
    provider_recording_id = $3,
    provider_uid = $4,
    output_prefix = $5,
    started_at = COALESCE(started_at, NOW()),
    empty_since_at = NULL,
    error = NULL,
    updated_at = NOW()
WHERE id = $1 AND status IN ('starting', 'started')
RETURNING *;

-- name: MarkRecordingPartStopping :one
UPDATE coaching_booking_recordings
SET status = 'stopping', updated_at = NOW()
WHERE id = $1 AND status IN ('started', 'stopping')
RETURNING *;

-- name: MarkRecordingPartStopped :one
UPDATE coaching_booking_recordings
SET status = 'stopped', stopped_at = NOW(), empty_since_at = NULL,
    renderer_token_hash = NULL, renderer_token_expires_at = NULL,
    error = NULL, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkRecordingPartFailed :exec
UPDATE coaching_booking_recordings
SET status = 'failed', stopped_at = NOW(), renderer_token_hash = NULL,
    renderer_token_expires_at = NULL, error = $2, updated_at = NOW()
WHERE id = $1;

-- name: ClearRecordingPartEmptySince :exec
UPDATE coaching_booking_recordings
SET empty_since_at = NULL, updated_at = NOW()
WHERE booking_id = $1 AND status IN ('starting', 'started');

-- name: MarkEmptyRecordingPartsWithoutFreshHumans :execrows
UPDATE coaching_booking_recordings recording
SET empty_since_at = COALESCE(empty_since_at, NOW()), updated_at = NOW()
WHERE recording.status = 'started'
  AND NOT EXISTS (
      SELECT 1 FROM coaching_booking_presence presence
      WHERE presence.booking_id = recording.booking_id
        AND presence.last_seen_at >= NOW() - (sqlc.arg(fresh_seconds)::int * interval '1 second')
  );

-- name: ListRecordingPartsReadyToStop :many
SELECT recording.*
FROM coaching_booking_recordings recording
JOIN coaching_bookings booking ON booking.id = recording.booking_id
WHERE recording.status IN ('starting', 'started', 'stopping')
  AND (
      recording.empty_since_at <= NOW() - (sqlc.arg(empty_grace_seconds)::int * interval '1 second')
      OR booking.scheduled_at + (booking.duration_minutes * interval '1 minute')
         + (sqlc.arg(end_grace_seconds)::int * interval '1 second') <= NOW()
      OR (recording.status = 'starting' AND recording.updated_at <= NOW() - interval '1 minute')
  )
ORDER BY recording.updated_at
LIMIT sqlc.arg(limit_count);

-- name: UpsertBookingPresence :one
INSERT INTO coaching_booking_presence (booking_id, participant_role, connection_id, last_seen_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (booking_id, participant_role) DO UPDATE SET
    connection_id = EXCLUDED.connection_id,
    last_seen_at = NOW()
RETURNING *;

-- name: RefreshBookingPresence :one
UPDATE coaching_booking_presence
SET last_seen_at = NOW()
WHERE booking_id = $1 AND participant_role = $2 AND connection_id = $3
RETURNING *;

-- name: RemoveBookingPresence :execrows
DELETE FROM coaching_booking_presence
WHERE booking_id = $1 AND participant_role = $2 AND connection_id = $3;

-- name: CountFreshBookingParticipants :one
SELECT COUNT(*) FROM coaching_booking_presence
WHERE booking_id = $1
  AND last_seen_at >= NOW() - (sqlc.arg(fresh_seconds)::int * interval '1 second');

-- name: ExchangeRecordingRendererCapability :one
SELECT
    recording.id AS recording_id,
    recording.booking_id,
    recording.provider_uid,
    booking.student_id,
    booking.expert_id,
    booking.scheduled_at,
    booking.duration_minutes
FROM coaching_booking_recordings recording
JOIN coaching_bookings booking ON booking.id = recording.booking_id
WHERE recording.renderer_token_hash = $1
  AND recording.renderer_token_expires_at > NOW()
  AND recording.status IN ('starting', 'started');

-- name: MarkRecordingRendererReady :one
UPDATE coaching_booking_recordings
SET status = 'started', updated_at = NOW()
WHERE renderer_token_hash = $1
  AND renderer_token_expires_at > NOW()
  AND status IN ('starting', 'started')
RETURNING id;

-- name: ListStoppedRecordingPartsForDiscovery :many
SELECT * FROM coaching_booking_recordings
WHERE status = 'stopped'
  AND stopped_at >= NOW() - interval '7 days'
ORDER BY stopped_at DESC
LIMIT $1;

-- name: EnsureRecordingPartImport :one
INSERT INTO coaching_recording_imports (recording_id, file_index, gcs_object_name, status, error)
VALUES ($1, $2, $3, 'pending', NULL)
ON CONFLICT (recording_id, file_index) DO UPDATE SET
    gcs_object_name = EXCLUDED.gcs_object_name,
    status = CASE WHEN coaching_recording_imports.status = 'ready'
                  THEN coaching_recording_imports.status ELSE 'pending' END,
    error = NULL,
    updated_at = NOW()
RETURNING *;

-- name: ClaimPendingRecordingPartImports :many
WITH candidates AS (
    SELECT recording_import.id
    FROM coaching_recording_imports recording_import
    WHERE recording_import.status IN ('pending', 'importing', 'processing', 'failed')
      AND recording_import.attempts < 5
      AND (
          recording_import.last_attempt_at IS NULL
          OR (recording_import.status = 'importing' AND recording_import.last_attempt_at <= NOW() - interval '5 minutes')
          OR (recording_import.status <> 'importing' AND recording_import.last_attempt_at <= NOW() - interval '1 minute')
      )
    ORDER BY recording_import.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT $1
), claimed AS (
    UPDATE coaching_recording_imports recording_import
    SET status = 'importing', attempts = attempts + 1, last_attempt_at = NOW(),
        error = NULL, updated_at = NOW()
    FROM candidates
    WHERE recording_import.id = candidates.id
    RETURNING recording_import.*
)
SELECT claimed.*, recording.booking_id, recording.part_number, booking.recording_asset_id,
       booking.student_id, booking.group_id, booking.scheduled_at,
       booking.duration_minutes, session_type.name AS session_type_name
FROM claimed
JOIN coaching_booking_recordings recording ON recording.id = claimed.recording_id
JOIN coaching_bookings booking ON booking.id = recording.booking_id
JOIN coaching_session_types session_type ON session_type.id = booking.session_type_id
ORDER BY recording.booking_id, recording.part_number, claimed.file_index;

-- name: MarkRecordingPartImportMuxCreated :one
UPDATE coaching_recording_imports
SET status = 'processing', mux_asset_id = $2, mux_playback_id = $3,
    error = NULL, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkRecordingPartImportReady :one
UPDATE coaching_recording_imports
SET status = 'ready', mux_asset_id = $2, mux_playback_id = $3,
    video_id = $4, imported_at = NOW(), error = NULL, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkRecordingPartImportFailed :exec
UPDATE coaching_recording_imports
SET status = 'failed', error = $2, updated_at = NOW()
WHERE id = $1;

-- name: GetBookingForRecordingAssetUpdate :one
SELECT * FROM coaching_bookings WHERE id = $1 FOR UPDATE;

-- name: AssignBookingRecordingAsset :one
UPDATE coaching_bookings
SET recording_asset_id = COALESCE(recording_asset_id, $2), updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListMyBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(latest.recording_status, '')::varchar AS recording_status,
       latest.video_id AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN LATERAL (
    SELECT COALESCE(recording_import.status::text, recording.status::text) AS recording_status,
           recording_import.video_id
    FROM coaching_booking_recordings recording
    LEFT JOIN coaching_recording_imports recording_import ON recording_import.recording_id = recording.id
    WHERE recording.booking_id = cb.id
    ORDER BY recording.part_number DESC, recording_import.file_index DESC NULLS LAST
    LIMIT 1
) latest ON true
WHERE (cb.expert_id = $1 OR cb.student_id = $1) AND cb.group_id = $2
ORDER BY cb.scheduled_at DESC;

-- name: ListGroupBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(latest.recording_status, '')::varchar AS recording_status,
       latest.video_id AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN LATERAL (
    SELECT COALESCE(recording_import.status::text, recording.status::text) AS recording_status,
           recording_import.video_id
    FROM coaching_booking_recordings recording
    LEFT JOIN coaching_recording_imports recording_import ON recording_import.recording_id = recording.id
    WHERE recording.booking_id = cb.id
    ORDER BY recording.part_number DESC, recording_import.file_index DESC NULLS LAST
    LIMIT 1
) latest ON true
WHERE cb.group_id = $1
ORDER BY cb.scheduled_at;

-- name: ListAllMyBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(latest.recording_status, '')::varchar AS recording_status,
       latest.video_id AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN LATERAL (
    SELECT COALESCE(recording_import.status::text, recording.status::text) AS recording_status,
           recording_import.video_id
    FROM coaching_booking_recordings recording
    LEFT JOIN coaching_recording_imports recording_import ON recording_import.recording_id = recording.id
    WHERE recording.booking_id = cb.id
    ORDER BY recording.part_number DESC, recording_import.file_index DESC NULLS LAST
    LIMIT 1
) latest ON true
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
       b.expert_id, b.student_id, b.group_id, b.scheduled_at, b.duration_minutes, b.is_cancelled
FROM coaching_booking_reminders r
JOIN coaching_bookings b ON b.id = r.booking_id
WHERE r.sent_at IS NULL
  AND r.remind_at <= NOW()
ORDER BY r.remind_at
LIMIT 100;

-- name: MarkReminderSent :exec
UPDATE coaching_booking_reminders SET sent_at = NOW() WHERE id = $1;
