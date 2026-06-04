-- Add threading support (parent_id) and author identity (author_id) to video_reviews.
-- Author name and avatar are resolved via LEFT JOIN to user_preferences — no data duplication.
ALTER TABLE video_reviews
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES video_reviews(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS author_id TEXT;

CREATE INDEX IF NOT EXISTS idx_video_reviews_parent_id ON video_reviews(parent_id);

-- Add first_name / last_name to user_preferences so author identity can be looked up.
-- Kept NOT NULL DEFAULT '' to match existing text columns in this table (e.g. timezone).
ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_name  TEXT NOT NULL DEFAULT '';
