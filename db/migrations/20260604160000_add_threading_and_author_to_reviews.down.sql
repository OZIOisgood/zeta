ALTER TABLE user_preferences
    DROP COLUMN IF EXISTS last_name,
    DROP COLUMN IF EXISTS first_name;

DROP INDEX IF EXISTS idx_video_reviews_parent_id;

ALTER TABLE video_reviews
    DROP COLUMN IF EXISTS author_id,
    DROP COLUMN IF EXISTS parent_id;
