ALTER TABLE user_preferences
ADD COLUMN username TEXT;

WITH candidate_usernames AS (
    SELECT
        user_id,
        NULLIF(
            regexp_replace(
                lower(
                    concat_ws(
                        '.',
                        NULLIF(trim(first_name), ''),
                        NULLIF(left(trim(last_name), 1), '')
                    )
                ),
                '[^a-z0-9._-]+',
                '',
                'g'
            ),
            ''
        ) AS candidate
    FROM user_preferences
),
ranked_usernames AS (
    SELECT
        user_id,
        CASE
            WHEN candidate ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'
            THEN candidate
            ELSE 'user'
        END AS base_username,
        row_number() OVER (
            PARTITION BY CASE
                WHEN candidate ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'
                THEN candidate
                ELSE 'user'
            END
            ORDER BY user_id
        ) AS duplicate_index
    FROM candidate_usernames
)
UPDATE user_preferences up
SET username = CASE
    WHEN ranked_usernames.duplicate_index = 1 THEN ranked_usernames.base_username
    ELSE left(
        ranked_usernames.base_username,
        30 - length('-' || ranked_usernames.duplicate_index::text)
    ) || '-' || ranked_usernames.duplicate_index::text
END
FROM ranked_usernames
WHERE ranked_usernames.user_id = up.user_id;

ALTER TABLE user_preferences
ALTER COLUMN username SET NOT NULL,
ADD CONSTRAINT user_preferences_username_format CHECK (
    username = lower(username)
    AND username ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'
    AND position('@' IN username) = 0
);

CREATE UNIQUE INDEX user_preferences_username_unique_idx
ON user_preferences (lower(username));
