CREATE TYPE coaching_recording_import_status AS ENUM (
    'pending',
    'importing',
    'processing',
    'ready',
    'failed'
);

ALTER TABLE videos
    ALTER COLUMN mux_upload_id DROP NOT NULL,
    ALTER COLUMN mux_upload_id SET DEFAULT '';

CREATE TABLE coaching_recording_imports (
    booking_id UUID PRIMARY KEY REFERENCES coaching_booking_recordings(booking_id) ON DELETE CASCADE,
    status coaching_recording_import_status NOT NULL DEFAULT 'pending',
    gcs_object_name TEXT,
    mux_asset_id TEXT,
    mux_playback_id TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    imported_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_recording_imports_pending
    ON coaching_recording_imports (status, last_attempt_at, booking_id)
    WHERE status IN ('pending', 'processing', 'failed');

CREATE INDEX idx_coaching_recording_imports_asset
    ON coaching_recording_imports (asset_id)
    WHERE asset_id IS NOT NULL;
