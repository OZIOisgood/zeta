-- Add threading support (parent_id) and author identity (author_id) to video_reviews.
-- Author name and avatar are resolved via LEFT JOIN to user_preferences.
ALTER TABLE video_reviews
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES video_reviews(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS author_id TEXT;

CREATE INDEX IF NOT EXISTS idx_video_reviews_parent_id ON video_reviews(parent_id);

-- Store profile names locally so comments can show authors without duplicating
-- names on every comment row. /auth/me keeps WorkOS and this row in sync.
ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_name  TEXT NOT NULL DEFAULT '';
