DO $$
BEGIN
    IF EXISTS (
        SELECT booking_id FROM coaching_booking_recordings
        GROUP BY booking_id HAVING COUNT(*) > 1
    ) OR EXISTS (
        SELECT recording_id FROM coaching_recording_imports
        GROUP BY recording_id HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'cannot roll back recording parts without losing recording data';
    END IF;
END $$;

DROP INDEX IF EXISTS idx_coaching_booking_presence_fresh;
DROP TABLE IF EXISTS coaching_booking_presence;

DROP INDEX IF EXISTS idx_coaching_recording_imports_video;
DROP INDEX IF EXISTS idx_coaching_recording_imports_mux_asset;
DROP INDEX IF EXISTS idx_coaching_recording_imports_gcs_object;
DROP INDEX IF EXISTS idx_coaching_recording_imports_pending;

ALTER TABLE coaching_recording_imports
    ADD COLUMN booking_id UUID,
    ADD COLUMN asset_id UUID;

UPDATE coaching_recording_imports recording_import
SET booking_id = recording.booking_id,
    asset_id = booking.recording_asset_id
FROM coaching_booking_recordings recording
JOIN coaching_bookings booking ON booking.id = recording.booking_id
WHERE recording.id = recording_import.recording_id;

ALTER TABLE coaching_recording_imports
    DROP CONSTRAINT coaching_recording_imports_pkey,
    DROP CONSTRAINT coaching_recording_imports_recording_file_key,
    DROP CONSTRAINT coaching_recording_imports_recording_id_fkey,
    ALTER COLUMN booking_id SET NOT NULL,
    ADD CONSTRAINT coaching_recording_imports_pkey PRIMARY KEY (booking_id),
    ADD CONSTRAINT coaching_recording_imports_asset_id_fkey
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
    DROP COLUMN id,
    DROP COLUMN recording_id,
    DROP COLUMN file_index;

CREATE INDEX idx_coaching_recording_imports_pending
    ON coaching_recording_imports (status, last_attempt_at, booking_id)
    WHERE status IN ('pending', 'processing', 'failed');

CREATE INDEX idx_coaching_recording_imports_asset
    ON coaching_recording_imports (asset_id)
    WHERE asset_id IS NOT NULL;

DROP INDEX IF EXISTS idx_coaching_booking_recordings_provider_recording;
DROP INDEX IF EXISTS idx_coaching_booking_recordings_renderer_token;
DROP INDEX IF EXISTS idx_coaching_booking_recordings_reconcile;
DROP INDEX IF EXISTS idx_coaching_booking_recordings_one_active;

ALTER TABLE coaching_booking_recordings
    DROP CONSTRAINT coaching_booking_recordings_pkey,
    DROP CONSTRAINT coaching_booking_recordings_booking_part_key,
    ADD CONSTRAINT coaching_booking_recordings_pkey PRIMARY KEY (booking_id),
    DROP COLUMN id,
    DROP COLUMN part_number,
    DROP COLUMN provider,
    DROP COLUMN renderer_token_hash,
    DROP COLUMN renderer_token_expires_at,
    DROP COLUMN empty_since_at;

ALTER TABLE coaching_booking_recordings RENAME COLUMN provider_resource_id TO resource_id;
ALTER TABLE coaching_booking_recordings RENAME COLUMN provider_recording_id TO sid;
ALTER TABLE coaching_booking_recordings RENAME COLUMN provider_uid TO uid;
ALTER TABLE coaching_booking_recordings RENAME COLUMN output_prefix TO file_prefix;

ALTER TABLE coaching_recording_imports
    ADD CONSTRAINT coaching_recording_imports_booking_id_fkey
        FOREIGN KEY (booking_id) REFERENCES coaching_booking_recordings(booking_id) ON DELETE CASCADE;

CREATE INDEX idx_coaching_booking_recordings_active
    ON coaching_booking_recordings (status, booking_id)
    WHERE status IN ('starting', 'started', 'stopping');

ALTER TABLE coaching_bookings
    DROP COLUMN recording_asset_id,
    DROP COLUMN next_recording_part_number;

DROP INDEX IF EXISTS idx_videos_asset_sort_order;
ALTER TABLE videos DROP COLUMN IF EXISTS sort_order;
