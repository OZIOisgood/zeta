-- name: CreateNotification :one
INSERT INTO notifications (recipient_id, type, payload)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetNotification :one
SELECT * FROM notifications
WHERE id = $1 LIMIT 1;

-- name: ListNotifications :many
SELECT * FROM notifications
WHERE recipient_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: CountUnreadNotifications :one
SELECT COUNT(*) FROM notifications
WHERE recipient_id = $1 AND read_at IS NULL;

-- name: MarkNotificationRead :exec
UPDATE notifications
SET read_at = NOW()
WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL;

-- name: MarkAllNotificationsRead :exec
UPDATE notifications
SET read_at = NOW()
WHERE recipient_id = $1 AND read_at IS NULL;

-- name: MarkNotificationReadByInviteCode :exec
UPDATE notifications
SET read_at = NOW()
WHERE recipient_id = @recipient_id
  AND type = 'group_invitation_received'
  AND payload->>'code' = @code
  AND read_at IS NULL;
