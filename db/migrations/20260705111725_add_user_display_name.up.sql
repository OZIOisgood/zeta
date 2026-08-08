ALTER TABLE user_preferences
ADD COLUMN display_name TEXT NOT NULL DEFAULT '';

UPDATE user_preferences
SET display_name = trim(
    first_name || ' ' ||
    CASE
        WHEN trim(last_name) = '' THEN ''
        ELSE upper(left(trim(last_name), 1)) || '.'
    END
)
WHERE trim(display_name) = '';
