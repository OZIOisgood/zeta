-- Persist the video duration (in seconds) so reports can aggregate watch/upload
-- length without calling Mux per row. Filled lazily when the playback ID is
-- resolved from Mux and via a one-off backfill for existing rows.
ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS duration_seconds DOUBLE PRECISION;
