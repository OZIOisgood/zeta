-- name: GetUserPreferences :one
SELECT * FROM user_preferences WHERE user_id = $1;

-- name: UpsertUserPreferences :one
INSERT INTO user_preferences (user_id, language)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET language = EXCLUDED.language,
    updated_at = NOW()
RETURNING *;

-- name: UpsertUserAvatar :one
INSERT INTO user_preferences (user_id, language, avatar)
VALUES ($1, 'en', $2)
ON CONFLICT (user_id) DO UPDATE
SET avatar     = EXCLUDED.avatar,
    updated_at = NOW()
RETURNING *;

-- name: UpdateUserAvatar :one
UPDATE user_preferences
SET avatar     = $2,
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;
