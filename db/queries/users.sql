-- name: GetUserPreferences :one
SELECT * FROM user_preferences WHERE user_id = $1;

-- name: GetUserEmailPreferences :one
SELECT
    email_notifications_enabled,
    email_asset_uploads_enabled,
    email_asset_reviews_enabled,
    email_invitation_updates_enabled,
    email_group_membership_updates_enabled,
    email_coaching_booking_updates_enabled,
    email_coaching_reminders_enabled
FROM user_preferences
WHERE user_id = $1;

-- name: UpsertUserPreferences :one
INSERT INTO user_preferences (user_id, language)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET language = EXCLUDED.language,
    updated_at = NOW()
RETURNING *;

-- name: SeedUserPreferences :one
INSERT INTO user_preferences (user_id, language, timezone, first_name, last_name)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE
SET language   = EXCLUDED.language,
    timezone   = EXCLUDED.timezone,
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    updated_at = NOW()
RETURNING *;

-- name: UpdateUserEmailPreferences :one
INSERT INTO user_preferences (
    user_id,
    email_notifications_enabled,
    email_asset_uploads_enabled,
    email_asset_reviews_enabled,
    email_invitation_updates_enabled,
    email_group_membership_updates_enabled,
    email_coaching_booking_updates_enabled,
    email_coaching_reminders_enabled
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (user_id) DO UPDATE
SET email_notifications_enabled = EXCLUDED.email_notifications_enabled,
    email_asset_uploads_enabled = EXCLUDED.email_asset_uploads_enabled,
    email_asset_reviews_enabled = EXCLUDED.email_asset_reviews_enabled,
    email_invitation_updates_enabled = EXCLUDED.email_invitation_updates_enabled,
    email_group_membership_updates_enabled = EXCLUDED.email_group_membership_updates_enabled,
    email_coaching_booking_updates_enabled = EXCLUDED.email_coaching_booking_updates_enabled,
    email_coaching_reminders_enabled = EXCLUDED.email_coaching_reminders_enabled,
    updated_at = NOW()
RETURNING *;

-- name: UpsertUserAvatar :one
INSERT INTO user_preferences (user_id, language, avatar, first_name, last_name)
VALUES ($1, 'en', $2, $3, $4)
ON CONFLICT (user_id) DO UPDATE
SET avatar     = EXCLUDED.avatar,
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    updated_at = NOW()
RETURNING *;

-- name: UpdateUserAvatar :one
UPDATE user_preferences
SET avatar     = $2,
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: UpdateUserName :execrows
UPDATE user_preferences
SET first_name = $2,
    last_name  = $3,
    updated_at = NOW()
WHERE user_id = $1;
