DROP INDEX IF EXISTS user_preferences_username_unique_idx;

ALTER TABLE user_preferences
DROP CONSTRAINT IF EXISTS user_preferences_username_format,
DROP COLUMN IF EXISTS username;
