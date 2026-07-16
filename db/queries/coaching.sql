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
       COALESCE(v2.recording_status, ri.status::text, r.status::text, '')::varchar AS recording_status,
       COALESCE(rc.asset_id, ri.asset_id) AS recording_asset_id,
       COALESCE(v2.video_id, ri.video_id) AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
LEFT JOIN coaching_recording_collections rc ON rc.booking_id = cb.id
LEFT JOIN LATERAL (
    SELECT COALESCE(attempt_import.status::text, attempt.status::text) AS recording_status,
           attempt_import.video_id
    FROM coaching_recording_attempts attempt
    LEFT JOIN coaching_recording_attempt_imports attempt_import ON attempt_import.attempt_id = attempt.id
    WHERE attempt.booking_id = cb.id
    ORDER BY attempt.attempt_number DESC
    LIMIT 1
) v2 ON true
WHERE (cb.expert_id = $1 OR cb.student_id = $1) AND cb.group_id = $2
ORDER BY cb.scheduled_at DESC;

-- name: ListGroupBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(v2.recording_status, ri.status::text, r.status::text, '')::varchar AS recording_status,
       COALESCE(rc.asset_id, ri.asset_id) AS recording_asset_id,
       COALESCE(v2.video_id, ri.video_id) AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
LEFT JOIN coaching_recording_collections rc ON rc.booking_id = cb.id
LEFT JOIN LATERAL (
    SELECT COALESCE(attempt_import.status::text, attempt.status::text) AS recording_status,
           attempt_import.video_id
    FROM coaching_recording_attempts attempt
    LEFT JOIN coaching_recording_attempt_imports attempt_import ON attempt_import.attempt_id = attempt.id
    WHERE attempt.booking_id = cb.id
    ORDER BY attempt.attempt_number DESC
    LIMIT 1
) v2 ON true
WHERE cb.group_id = $1
ORDER BY cb.scheduled_at;

-- name: ListAllMyBookings :many
SELECT cb.*, cst.name AS session_type_name,
       COALESCE(v2.recording_status, ri.status::text, r.status::text, '')::varchar AS recording_status,
       COALESCE(rc.asset_id, ri.asset_id) AS recording_asset_id,
       COALESCE(v2.video_id, ri.video_id) AS recording_video_id
FROM coaching_bookings cb
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
LEFT JOIN coaching_recording_collections rc ON rc.booking_id = cb.id
LEFT JOIN LATERAL (
    SELECT COALESCE(attempt_import.status::text, attempt.status::text) AS recording_status,
           attempt_import.video_id
    FROM coaching_recording_attempts attempt
    LEFT JOIN coaching_recording_attempt_imports attempt_import ON attempt_import.attempt_id = attempt.id
    WHERE attempt.booking_id = cb.id
    ORDER BY attempt.attempt_number DESC
    LIMIT 1
) v2 ON true
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

-- === Recording collections / attempts ===

-- name: AdoptLegacyRecordingCollections :execrows
INSERT INTO coaching_recording_collections (
    booking_id, asset_id, status, next_attempt_number, sealed_at, created_at, updated_at
)
SELECT
    recording.booking_id,
    legacy_import.asset_id,
    CASE
        WHEN booking.scheduled_at + (booking.duration_minutes * interval '1 minute') <= NOW()
            THEN 'sealed'::coaching_recording_collection_status
        ELSE 'open'::coaching_recording_collection_status
    END,
    2,
    CASE
        WHEN booking.scheduled_at + (booking.duration_minutes * interval '1 minute') <= NOW()
            THEN NOW()
        ELSE NULL
    END,
    recording.created_at,
    recording.updated_at
FROM coaching_booking_recordings recording
JOIN coaching_bookings booking ON booking.id = recording.booking_id
LEFT JOIN coaching_recording_imports legacy_import ON legacy_import.booking_id = recording.booking_id
WHERE recording.updated_at <= NOW() - interval '10 minutes'
ON CONFLICT (booking_id) DO NOTHING;

-- name: AdoptLegacyRecordingAttempts :execrows
INSERT INTO coaching_recording_attempts (
    booking_id, attempt_number, mode, status, resource_id, sid, provider_uid,
    file_prefix, started_at, stopped_at, error, created_at, updated_at
)
SELECT
    recording.booking_id, 1, 'mix', recording.status, recording.resource_id, recording.sid,
    COALESCE(NULLIF(recording.uid, ''), '3'), COALESCE(recording.file_prefix, '{}'),
    recording.started_at, recording.stopped_at, recording.error,
    recording.created_at, recording.updated_at
FROM coaching_booking_recordings recording
JOIN coaching_recording_collections collection ON collection.booking_id = recording.booking_id
WHERE recording.updated_at <= NOW() - interval '10 minutes'
ON CONFLICT (booking_id, attempt_number) DO NOTHING;

-- name: AdoptLegacyRecordingImports :execrows
INSERT INTO coaching_recording_attempt_imports (
    attempt_id, status, gcs_object_name, mux_asset_id, mux_playback_id, video_id,
    attempts, last_attempt_at, imported_at, error, created_at, updated_at
)
SELECT
    attempt.id, legacy.status::text::coaching_recording_attempt_import_status,
    legacy.gcs_object_name, legacy.mux_asset_id, legacy.mux_playback_id, legacy.video_id,
    legacy.attempts, legacy.last_attempt_at, legacy.imported_at, legacy.error,
    legacy.created_at, legacy.updated_at
FROM coaching_recording_imports legacy
JOIN coaching_recording_attempts attempt
  ON attempt.booking_id = legacy.booking_id AND attempt.attempt_number = 1
WHERE legacy.updated_at <= NOW() - interval '10 minutes'
ON CONFLICT (attempt_id) DO NOTHING;

-- name: EnsureRecordingCollection :one
INSERT INTO coaching_recording_collections (booking_id)
VALUES ($1)
ON CONFLICT (booking_id) DO UPDATE SET updated_at = NOW()
RETURNING *;

-- name: GetRecordingCollectionForUpdate :one
SELECT * FROM coaching_recording_collections
WHERE booking_id = $1
FOR UPDATE;

-- name: ClaimNextRecordingAttempt :one
WITH claimed_collection AS (
    UPDATE coaching_recording_collections
    SET next_attempt_number = next_attempt_number + 1,
        updated_at = NOW()
    WHERE booking_id = sqlc.arg(booking_id)
      AND status = 'open'
      AND NOT EXISTS (
          SELECT 1 FROM coaching_recording_attempts
          WHERE booking_id = sqlc.arg(booking_id)
            AND status IN ('starting', 'started', 'stopping')
      )
    RETURNING next_attempt_number - 1 AS attempt_number
)
INSERT INTO coaching_recording_attempts (
    booking_id, attempt_number, mode, provider_uid
)
SELECT
    sqlc.arg(booking_id),
    claimed_collection.attempt_number,
    sqlc.arg(recording_mode),
    sqlc.arg(provider_uid)
FROM claimed_collection
RETURNING *;

-- name: GetActiveRecordingAttempt :one
SELECT * FROM coaching_recording_attempts
WHERE booking_id = $1
  AND status IN ('starting', 'started', 'stopping')
ORDER BY attempt_number DESC
LIMIT 1;

-- name: GetRecordingAttempt :one
SELECT * FROM coaching_recording_attempts WHERE id = $1;

-- name: MarkRecordingAttemptStarted :one
UPDATE coaching_recording_attempts
SET status = 'started',
    resource_id = $2,
    sid = $3,
    file_prefix = $4,
    started_at = NOW(),
    stopped_at = NULL,
    empty_since_at = NULL,
    error = NULL,
    updated_at = NOW()
WHERE id = $1 AND status = 'starting'
RETURNING *;

-- name: MarkRecordingAttemptStopping :one
UPDATE coaching_recording_attempts
SET status = 'stopping', stop_requested_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status IN ('starting', 'started')
RETURNING *;

-- name: MarkRecordingAttemptStopped :one
UPDATE coaching_recording_attempts
SET status = 'stopped',
    stopped_at = NOW(),
    empty_since_at = NULL,
    error = NULL,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkRecordingAttemptFailed :exec
UPDATE coaching_recording_attempts
SET status = 'failed', error = $2, stopped_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: SetRecordingAttemptEmptySince :exec
UPDATE coaching_recording_attempts
SET empty_since_at = COALESCE(empty_since_at, NOW()), updated_at = NOW()
WHERE id = $1 AND status = 'started';

-- name: ClearRecordingAttemptEmptySince :exec
UPDATE coaching_recording_attempts
SET empty_since_at = NULL, updated_at = NOW()
WHERE id = $1 AND status = 'started';

-- name: ListRecordingAttemptsReadyToStop :many
SELECT attempt.*
FROM coaching_recording_attempts attempt
JOIN coaching_bookings booking ON booking.id = attempt.booking_id
WHERE attempt.status IN ('starting', 'started', 'stopping')
  AND (
      attempt.empty_since_at <= NOW() - (sqlc.arg(empty_grace_seconds)::int * interval '1 second')
      OR booking.scheduled_at
         + (booking.duration_minutes * interval '1 minute')
         + (sqlc.arg(end_grace_seconds)::int * interval '1 second') <= NOW()
  )
ORDER BY attempt.updated_at
LIMIT sqlc.arg(limit_count);

-- name: MarkEmptyRecordingAttemptsWithoutFreshHumans :execrows
UPDATE coaching_recording_attempts attempt
SET empty_since_at = COALESCE(empty_since_at, NOW()), updated_at = NOW()
WHERE attempt.status = 'started'
  AND NOT EXISTS (
      SELECT 1
      FROM coaching_booking_participant_state participant
      WHERE participant.booking_id = attempt.booking_id
        AND participant.connection_state IN ('connected', 'reconnecting')
        AND participant.last_seen_at >= NOW() - (sqlc.arg(fresh_seconds)::int * interval '1 second')
  );

-- name: SealFinishedRecordingCollections :execrows
UPDATE coaching_recording_collections collection
SET status = 'sealed', sealed_at = NOW(), updated_at = NOW()
FROM coaching_bookings booking
WHERE booking.id = collection.booking_id
  AND collection.status = 'open'
  AND booking.scheduled_at
      + (booking.duration_minutes * interval '1 minute')
      + (sqlc.arg(end_grace_seconds)::int * interval '1 second') <= NOW()
  AND NOT EXISTS (
      SELECT 1 FROM coaching_recording_attempts attempt
      WHERE attempt.booking_id = collection.booking_id
        AND attempt.status IN ('starting', 'started', 'stopping')
  );

-- === Participant presence ===

-- name: ActivateParticipantState :one
INSERT INTO coaching_booking_participant_state (
    booking_id,
    participant_role,
    user_id,
    agora_uid,
    connection_generation,
    last_event_seq,
    connection_state,
    audio_published,
    audio_enabled,
    video_published,
    video_enabled,
    joined_at,
    left_at,
    last_seen_at
)
VALUES (
    $1, $2, $3, $4, $5, $6, 'connected', $7, $8, $9, $10, NOW(), NULL, NOW()
)
ON CONFLICT (booking_id, participant_role) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    agora_uid = EXCLUDED.agora_uid,
    connection_generation = EXCLUDED.connection_generation,
    last_event_seq = EXCLUDED.last_event_seq,
    connection_state = 'connected',
    audio_published = EXCLUDED.audio_published,
    audio_enabled = EXCLUDED.audio_enabled,
    video_published = EXCLUDED.video_published,
    video_enabled = EXCLUDED.video_enabled,
    joined_at = NOW(),
    left_at = NULL,
    last_seen_at = NOW(),
    updated_at = NOW()
RETURNING *;

-- name: RefreshParticipantState :one
UPDATE coaching_booking_participant_state
SET connection_state = $4,
    last_event_seq = $5,
    audio_published = $6,
    audio_enabled = $7,
    video_published = $8,
    video_enabled = $9,
    last_seen_at = NOW(),
    left_at = CASE WHEN $4 = 'disconnected' THEN NOW() ELSE NULL END,
    updated_at = NOW()
WHERE booking_id = $1
  AND participant_role = $2
  AND connection_generation = $3
  AND $5 > last_event_seq
RETURNING *;

-- name: CountFreshHumanParticipants :one
SELECT COUNT(*)
FROM coaching_booking_participant_state
WHERE booking_id = $1
  AND connection_state IN ('connected', 'reconnecting')
  AND last_seen_at >= NOW() - (sqlc.arg(fresh_seconds)::int * interval '1 second');

-- === Secure renderer bootstrap ===

-- name: CreateRendererCapability :one
INSERT INTO coaching_recording_renderer_capabilities (
    attempt_id, token_hash, renderer_uid, expires_at
)
VALUES ($1, $2, $3, $4)
ON CONFLICT (attempt_id) DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    renderer_uid = EXCLUDED.renderer_uid,
    expires_at = EXCLUDED.expires_at,
    last_exchanged_at = NULL,
    exchange_count = 0,
    revoked_at = NULL
RETURNING *;

-- name: ExchangeRendererCapability :one
UPDATE coaching_recording_renderer_capabilities capability
SET last_exchanged_at = NOW(), exchange_count = exchange_count + 1
WHERE capability.token_hash = $1
  AND capability.revoked_at IS NULL
  AND capability.expires_at > NOW()
  AND capability.exchange_count < sqlc.arg(max_exchanges)
RETURNING *;

-- name: RevokeRendererCapability :exec
UPDATE coaching_recording_renderer_capabilities
SET revoked_at = NOW()
WHERE attempt_id = $1 AND revoked_at IS NULL;

-- name: GetRecordingRendererContext :one
SELECT
    attempt.id AS attempt_id,
    attempt.booking_id,
    attempt.status AS attempt_status,
    attempt.provider_uid,
    booking.student_id,
    booking.expert_id,
    booking.scheduled_at,
    booking.duration_minutes
FROM coaching_recording_attempts attempt
JOIN coaching_bookings booking ON booking.id = attempt.booking_id
WHERE attempt.id = $1;

-- === Attempt-scoped imports ===

-- name: EnsureAttemptImportPending :one
INSERT INTO coaching_recording_attempt_imports (attempt_id, status, error)
VALUES ($1, 'pending', NULL)
ON CONFLICT (attempt_id) DO UPDATE SET
    status = CASE
        WHEN coaching_recording_attempt_imports.status IN ('ready', 'quarantined')
            THEN coaching_recording_attempt_imports.status
        ELSE 'pending'
    END,
    error = NULL,
    updated_at = NOW()
RETURNING *;

-- name: ClaimPendingAttemptImports :many
WITH candidates AS (
    SELECT attempt_import.attempt_id
    FROM coaching_recording_attempt_imports attempt_import
    WHERE attempt_import.status IN ('pending', 'processing', 'failed', 'importing')
      AND attempt_import.attempts < 5
      AND (
          attempt_import.last_attempt_at IS NULL
          OR (
              attempt_import.status = 'importing'
              AND attempt_import.last_attempt_at <= NOW() - interval '5 minutes'
          )
          OR (
              attempt_import.status <> 'importing'
              AND attempt_import.last_attempt_at <= NOW() - interval '1 minute'
          )
      )
    ORDER BY attempt_import.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT $1
), claimed AS (
    UPDATE coaching_recording_attempt_imports attempt_import
    SET status = 'importing',
        attempts = attempt_import.attempts + 1,
        last_attempt_at = NOW(),
        error = NULL,
        updated_at = NOW()
    FROM candidates
    WHERE attempt_import.attempt_id = candidates.attempt_id
    RETURNING attempt_import.*
)
SELECT
    claimed.*,
    attempt.booking_id,
    attempt.attempt_number,
    attempt.file_prefix,
    collection.asset_id,
    booking.student_id,
    booking.group_id,
    booking.scheduled_at,
    booking.duration_minutes,
    session_type.name AS session_type_name
FROM claimed
JOIN coaching_recording_attempts attempt ON attempt.id = claimed.attempt_id
JOIN coaching_recording_collections collection ON collection.booking_id = attempt.booking_id
JOIN coaching_bookings booking ON booking.id = attempt.booking_id
JOIN coaching_session_types session_type ON session_type.id = booking.session_type_id
ORDER BY attempt.booking_id, attempt.attempt_number;

-- name: MarkAttemptImportMuxCreated :one
UPDATE coaching_recording_attempt_imports
SET status = 'processing',
    gcs_object_name = $2,
    mux_asset_id = $3,
    mux_playback_id = $4,
    error = NULL,
    updated_at = NOW()
WHERE attempt_id = $1
RETURNING *;

-- name: MarkAttemptImportReady :one
UPDATE coaching_recording_attempt_imports
SET status = 'ready',
    gcs_object_name = $2,
    mux_asset_id = $3,
    mux_playback_id = $4,
    mux_duration_seconds = $5,
    video_id = $6,
    imported_at = NOW(),
    error = NULL,
    updated_at = NOW()
WHERE attempt_id = $1
RETURNING *;

-- name: MarkAttemptImportFailed :exec
UPDATE coaching_recording_attempt_imports
SET status = CASE WHEN attempts >= 5 THEN 'quarantined' ELSE 'failed' END,
    error = $2,
    updated_at = NOW()
WHERE attempt_id = $1;

-- name: AssignRecordingCollectionAsset :one
UPDATE coaching_recording_collections
SET asset_id = COALESCE(asset_id, $2), updated_at = NOW()
WHERE booking_id = $1
RETURNING *;

-- name: PublishSealedRecordingAssets :execrows
UPDATE assets asset
SET status = 'pending', updated_at = NOW()
FROM coaching_recording_collections collection
WHERE collection.asset_id = asset.id
  AND collection.status = 'sealed'
  AND asset.status = 'waiting_upload'
  AND EXISTS (
      SELECT 1
      FROM coaching_recording_attempts attempt
      JOIN coaching_recording_attempt_imports attempt_import ON attempt_import.attempt_id = attempt.id
      WHERE attempt.booking_id = collection.booking_id
        AND attempt_import.status = 'ready'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM coaching_recording_attempts attempt
      LEFT JOIN coaching_recording_attempt_imports attempt_import ON attempt_import.attempt_id = attempt.id
      WHERE attempt.booking_id = collection.booking_id
        AND (
            attempt.status IN ('starting', 'started', 'stopping')
            OR attempt_import.status IN ('pending', 'importing', 'processing', 'failed')
        )
  );
