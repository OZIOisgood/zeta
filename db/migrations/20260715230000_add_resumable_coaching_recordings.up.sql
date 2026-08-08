ALTER TABLE videos
    ADD COLUMN sort_order INTEGER
    CONSTRAINT videos_sort_order_positive CHECK (sort_order IS NULL OR sort_order > 0);

CREATE UNIQUE INDEX idx_videos_asset_sort_order
    ON videos (asset_id, sort_order)
    WHERE sort_order IS NOT NULL;

-- The booking is the recording collection: every resumed recording appends an
-- ordered video part to this one review asset.
ALTER TABLE coaching_bookings
    ADD COLUMN recording_asset_id UUID UNIQUE REFERENCES assets(id) ON DELETE SET NULL,
    ADD COLUMN next_recording_part_number INTEGER NOT NULL DEFAULT 1
        CONSTRAINT coaching_bookings_next_recording_part_positive CHECK (next_recording_part_number > 0);

-- Evolve the original one-row-per-booking table into one row per continuous
-- recording interval. Provider-neutral names make a later Zeta recorder a
-- provider swap rather than another schema rewrite.
ALTER TABLE coaching_booking_recordings
    ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN part_number INTEGER NOT NULL DEFAULT 1
        CONSTRAINT coaching_booking_recordings_part_positive CHECK (part_number > 0),
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'agora_mix',
    ADD COLUMN renderer_token_hash BYTEA,
    ADD COLUMN renderer_token_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN empty_since_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE coaching_booking_recordings RENAME COLUMN resource_id TO provider_resource_id;
ALTER TABLE coaching_booking_recordings RENAME COLUMN sid TO provider_recording_id;
ALTER TABLE coaching_booking_recordings RENAME COLUMN uid TO provider_uid;
ALTER TABLE coaching_booking_recordings RENAME COLUMN file_prefix TO output_prefix;

-- The legacy import FK points at the old booking_id primary key, so detach it
-- before replacing that primary key with the recording id.
ALTER TABLE coaching_recording_imports
    DROP CONSTRAINT coaching_recording_imports_booking_id_fkey;

ALTER TABLE coaching_booking_recordings
    DROP CONSTRAINT coaching_booking_recordings_pkey,
    ADD CONSTRAINT coaching_booking_recordings_pkey PRIMARY KEY (id),
    ADD CONSTRAINT coaching_booking_recordings_booking_part_key UNIQUE (booking_id, part_number);

DROP INDEX idx_coaching_booking_recordings_active;

CREATE UNIQUE INDEX idx_coaching_booking_recordings_one_active
    ON coaching_booking_recordings (booking_id)
    WHERE status IN ('starting', 'started', 'stopping');

CREATE INDEX idx_coaching_booking_recordings_reconcile
    ON coaching_booking_recordings (status, empty_since_at, updated_at)
    WHERE status IN ('starting', 'started', 'stopping');

CREATE UNIQUE INDEX idx_coaching_booking_recordings_renderer_token
    ON coaching_booking_recordings (renderer_token_hash)
    WHERE renderer_token_hash IS NOT NULL;

CREATE UNIQUE INDEX idx_coaching_booking_recordings_provider_recording
    ON coaching_booking_recordings (provider, provider_recording_id)
    WHERE provider_recording_id IS NOT NULL;

UPDATE coaching_bookings booking
SET next_recording_part_number = 2
WHERE EXISTS (
    SELECT 1 FROM coaching_booking_recordings recording
    WHERE recording.booking_id = booking.id
);

-- An import is one provider MP4. Usually Page Recording produces one MP4,
-- but the same table safely represents provider-side splits without another
-- manifest/files table.
ALTER TABLE coaching_recording_imports
    ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN recording_id UUID,
    ADD COLUMN file_index INTEGER NOT NULL DEFAULT 1
        CONSTRAINT coaching_recording_imports_file_index_positive CHECK (file_index > 0);

UPDATE coaching_recording_imports recording_import
SET recording_id = recording.id
FROM coaching_booking_recordings recording
WHERE recording.booking_id = recording_import.booking_id
  AND recording.part_number = 1;

UPDATE coaching_bookings booking
SET recording_asset_id = recording_import.asset_id
FROM coaching_recording_imports recording_import
WHERE recording_import.booking_id = booking.id
  AND recording_import.asset_id IS NOT NULL;

ALTER TABLE coaching_recording_imports
    ALTER COLUMN recording_id SET NOT NULL,
    DROP CONSTRAINT coaching_recording_imports_pkey,
    DROP CONSTRAINT coaching_recording_imports_asset_id_fkey,
    DROP COLUMN booking_id,
    DROP COLUMN asset_id,
    ADD CONSTRAINT coaching_recording_imports_pkey PRIMARY KEY (id),
    ADD CONSTRAINT coaching_recording_imports_recording_id_fkey
        FOREIGN KEY (recording_id) REFERENCES coaching_booking_recordings(id) ON DELETE CASCADE,
    ADD CONSTRAINT coaching_recording_imports_recording_file_key UNIQUE (recording_id, file_index);

DROP INDEX IF EXISTS idx_coaching_recording_imports_pending;
DROP INDEX IF EXISTS idx_coaching_recording_imports_asset;

CREATE INDEX idx_coaching_recording_imports_pending
    ON coaching_recording_imports (status, last_attempt_at, id)
    WHERE status IN ('pending', 'importing', 'processing', 'failed');

CREATE UNIQUE INDEX idx_coaching_recording_imports_gcs_object
    ON coaching_recording_imports (gcs_object_name)
    WHERE gcs_object_name IS NOT NULL;

CREATE UNIQUE INDEX idx_coaching_recording_imports_mux_asset
    ON coaching_recording_imports (mux_asset_id)
    WHERE mux_asset_id IS NOT NULL;

CREATE UNIQUE INDEX idx_coaching_recording_imports_video
    ON coaching_recording_imports (video_id)
    WHERE video_id IS NOT NULL;

UPDATE videos video
SET sort_order = recording.part_number * 1000 + recording_import.file_index
FROM coaching_recording_imports recording_import
JOIN coaching_booking_recordings recording ON recording.id = recording_import.recording_id
WHERE video.id = recording_import.video_id
  AND video.sort_order IS NULL;

-- Only authenticated human liveness is persisted. Camera/microphone state is
-- rendered directly from Agora events and does not belong in PostgreSQL.
CREATE TABLE coaching_booking_presence (
    booking_id UUID NOT NULL REFERENCES coaching_bookings(id) ON DELETE CASCADE,
    participant_role TEXT NOT NULL CHECK (participant_role IN ('student', 'expert')),
    connection_id UUID NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, participant_role)
);

CREATE INDEX idx_coaching_booking_presence_fresh
    ON coaching_booking_presence (booking_id, last_seen_at);
