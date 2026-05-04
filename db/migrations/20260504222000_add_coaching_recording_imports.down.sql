DROP INDEX IF EXISTS idx_coaching_recording_imports_asset;
DROP INDEX IF EXISTS idx_coaching_recording_imports_pending;
DROP TABLE IF EXISTS coaching_recording_imports;

ALTER TABLE videos
    ALTER COLUMN mux_upload_id DROP DEFAULT,
    ALTER COLUMN mux_upload_id SET NOT NULL;

DROP TYPE IF EXISTS coaching_recording_import_status;
