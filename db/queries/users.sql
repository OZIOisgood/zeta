-- name: GetUserPreferences :one
SELECT * FROM user_preferences WHERE user_id = $1;

-- name: UpsertUserPreferences :one
INSERT INTO user_preferences (user_id, language)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET language = EXCLUDED.language,
    updated_at = NOW()
RETURNING *;
