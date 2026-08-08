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

-- name: SeedUserPreferences :one
INSERT INTO user_preferences (user_id, language, timezone, first_name, last_name, display_name)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: SeedUserPreferencesWithAvatar :one
INSERT INTO user_preferences (user_id, language, timezone, first_name, last_name, display_name, avatar)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateUserProfilePreferences :one
UPDATE user_preferences
SET language   = $2,
    timezone   = $3,
    first_name = $4,
    last_name  = $5,
    display_name = $6,
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: UpdateUserEmailPreferences :one
UPDATE user_preferences
SET email_notifications_enabled = $2,
    email_asset_uploads_enabled = $3,
    email_asset_reviews_enabled = $4,
    email_invitation_updates_enabled = $5,
    email_group_membership_updates_enabled = $6,
    email_coaching_booking_updates_enabled = $7,
    email_coaching_reminders_enabled = $8,
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: UpdateUserAvatar :one
UPDATE user_preferences
SET avatar     = $2,
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;
