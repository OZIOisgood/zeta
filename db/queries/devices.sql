-- name: UpsertDevice :one
INSERT INTO user_devices (user_id, expo_push_token, platform)
VALUES ($1, $2, $3)
ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id      = excluded.user_id,
        platform     = excluded.platform,
        last_seen_at = now()
RETURNING *;

-- name: DeleteDevice :exec
DELETE FROM user_devices
WHERE expo_push_token = $1
  AND user_id = $2;

-- name: DeleteDeviceByToken :exec
DELETE FROM user_devices
WHERE expo_push_token = $1;

-- name: ListDevicesForUser :many
SELECT * FROM user_devices
WHERE user_id = $1;

-- name: GetUserPushPreferences :one
SELECT
    push_notifications_enabled,
    push_asset_uploads_enabled,
    push_asset_reviews_enabled,
    push_invitation_updates_enabled,
    push_group_membership_updates_enabled,
    push_coaching_booking_updates_enabled
FROM user_preferences
WHERE user_id = $1;

-- name: UpdateUserPushPreferences :one
UPDATE user_preferences
SET push_notifications_enabled            = $2,
    push_asset_uploads_enabled            = $3,
    push_asset_reviews_enabled            = $4,
    push_invitation_updates_enabled       = $5,
    push_group_membership_updates_enabled = $6,
    push_coaching_booking_updates_enabled = $7,
    updated_at                            = NOW()
WHERE user_id = $1
RETURNING *;
