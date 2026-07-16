CREATE TYPE coaching_recording_collection_status AS ENUM ('open', 'sealed');

CREATE TYPE coaching_recording_attempt_import_status AS ENUM (
    'pending',
    'importing',
    'processing',
    'ready',
    'failed',
    'quarantined'
);

ALTER TABLE videos
    ADD COLUMN sort_order INTEGER
    CONSTRAINT videos_sort_order_positive CHECK (sort_order IS NULL OR sort_order > 0);

CREATE UNIQUE INDEX idx_videos_asset_sort_order
    ON videos (asset_id, sort_order)
    WHERE sort_order IS NOT NULL;

CREATE TABLE coaching_recording_collections (
    booking_id UUID PRIMARY KEY REFERENCES coaching_bookings(id) ON DELETE CASCADE,
    asset_id UUID UNIQUE REFERENCES assets(id) ON DELETE SET NULL,
    status coaching_recording_collection_status NOT NULL DEFAULT 'open',
    next_attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (next_attempt_number > 0),
    sealed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE coaching_recording_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES coaching_recording_collections(booking_id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    mode TEXT NOT NULL DEFAULT 'web' CHECK (mode IN ('mix', 'web')),
    status coaching_recording_status NOT NULL DEFAULT 'starting',
    resource_id TEXT,
    sid TEXT,
    provider_uid TEXT NOT NULL,
    file_prefix TEXT[] NOT NULL DEFAULT '{}',
    file_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_provider_state TEXT,
    last_provider_checked_at TIMESTAMP WITH TIME ZONE,
    empty_since_at TIMESTAMP WITH TIME ZONE,
    stop_requested_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (booking_id, attempt_number)
);

CREATE UNIQUE INDEX idx_coaching_recording_attempts_one_active
    ON coaching_recording_attempts (booking_id)
    WHERE status IN ('starting', 'started', 'stopping');

CREATE INDEX idx_coaching_recording_attempts_reconcile
    ON coaching_recording_attempts (status, empty_since_at, updated_at)
    WHERE status IN ('starting', 'started', 'stopping');

CREATE TABLE coaching_recording_attempt_imports (
    attempt_id UUID PRIMARY KEY REFERENCES coaching_recording_attempts(id) ON DELETE CASCADE,
    status coaching_recording_attempt_import_status NOT NULL DEFAULT 'pending',
    gcs_object_name TEXT,
    gcs_object_size_bytes BIGINT,
    provider_duration_seconds DOUBLE PRECISION,
    mux_asset_id TEXT UNIQUE,
    mux_playback_id TEXT,
    mux_duration_seconds DOUBLE PRECISION,
    video_id UUID UNIQUE REFERENCES videos(id) ON DELETE SET NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    imported_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_recording_attempt_imports_pending
    ON coaching_recording_attempt_imports (status, last_attempt_at, attempt_id)
    WHERE status IN ('pending', 'importing', 'processing', 'failed');

CREATE TABLE coaching_booking_participant_state (
    booking_id UUID NOT NULL REFERENCES coaching_bookings(id) ON DELETE CASCADE,
    participant_role TEXT NOT NULL CHECK (participant_role IN ('student', 'expert')),
    user_id TEXT NOT NULL,
    agora_uid INTEGER NOT NULL CHECK (agora_uid IN (1, 2)),
    connection_generation UUID NOT NULL DEFAULT gen_random_uuid(),
    last_event_seq BIGINT NOT NULL DEFAULT 0 CHECK (last_event_seq >= 0),
    connection_state TEXT NOT NULL DEFAULT 'disconnected'
        CHECK (connection_state IN ('connected', 'reconnecting', 'disconnected')),
    audio_published BOOLEAN NOT NULL DEFAULT FALSE,
    audio_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    video_published BOOLEAN NOT NULL DEFAULT FALSE,
    video_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, participant_role),
    UNIQUE (booking_id, user_id)
);

CREATE INDEX idx_coaching_booking_participant_state_fresh
    ON coaching_booking_participant_state (booking_id, connection_state, last_seen_at);

CREATE TABLE coaching_recording_attempt_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES coaching_recording_attempts(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL CHECK (sequence_number >= 0),
    file_name TEXT NOT NULL,
    slice_start_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, sequence_number),
    UNIQUE (attempt_id, file_name)
);

CREATE TABLE coaching_recording_renderer_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES coaching_recording_attempts(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL UNIQUE,
    renderer_uid INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_exchanged_at TIMESTAMP WITH TIME ZONE,
    exchange_count INTEGER NOT NULL DEFAULT 0,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_recording_renderer_capabilities_expiry
    ON coaching_recording_renderer_capabilities (expires_at)
    WHERE revoked_at IS NULL;

-- Preserve legacy recordings so the new worker can finish already-running and
-- already-recorded sessions without the old and new importers racing.
INSERT INTO coaching_recording_collections (
    booking_id,
    asset_id,
    status,
    next_attempt_number,
    sealed_at,
    created_at,
    updated_at
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
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO coaching_recording_attempts (
    booking_id,
    attempt_number,
    mode,
    status,
    resource_id,
    sid,
    provider_uid,
    file_prefix,
    started_at,
    stopped_at,
    error,
    created_at,
    updated_at
)
SELECT
    recording.booking_id,
    1,
    'mix',
    recording.status,
    recording.resource_id,
    recording.sid,
    COALESCE(NULLIF(recording.uid, ''), '3'),
    COALESCE(recording.file_prefix, '{}'),
    recording.started_at,
    recording.stopped_at,
    recording.error,
    recording.created_at,
    recording.updated_at
FROM coaching_booking_recordings recording
JOIN coaching_recording_collections collection ON collection.booking_id = recording.booking_id
ON CONFLICT (booking_id, attempt_number) DO NOTHING;

INSERT INTO coaching_recording_attempt_imports (
    attempt_id,
    status,
    gcs_object_name,
    mux_asset_id,
    mux_playback_id,
    video_id,
    attempts,
    last_attempt_at,
    imported_at,
    error,
    created_at,
    updated_at
)
SELECT
    attempt.id,
    legacy.status::text::coaching_recording_attempt_import_status,
    legacy.gcs_object_name,
    legacy.mux_asset_id,
    legacy.mux_playback_id,
    legacy.video_id,
    legacy.attempts,
    legacy.last_attempt_at,
    legacy.imported_at,
    legacy.error,
    legacy.created_at,
    legacy.updated_at
FROM coaching_recording_imports legacy
JOIN coaching_recording_attempts attempt
  ON attempt.booking_id = legacy.booking_id
 AND attempt.attempt_number = 1
ON CONFLICT (attempt_id) DO NOTHING;

UPDATE videos video
SET sort_order = attempt.attempt_number
FROM coaching_recording_attempt_imports attempt_import
JOIN coaching_recording_attempts attempt ON attempt.id = attempt_import.attempt_id
WHERE video.id = attempt_import.video_id
  AND video.sort_order IS NULL;
