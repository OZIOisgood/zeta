-- name: CreateModerationReport :one
INSERT INTO moderation_reports (
  reporter_user_id,
  reporter_display_name,
  subject_type,
  target_review_id,
  target_video_id,
  target_user_id,
  target_display_name,
  target_review_content,
  reason,
  details,
  page_url,
  user_agent,
  discord_channel_id
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13
)
RETURNING *;

-- name: GetReviewModerationTarget :one
SELECT
  r.id AS review_id,
  r.video_id,
  r.author_id AS target_user_id,
  r.content AS target_review_content,
  COALESCE(NULLIF(trim(up.first_name || ' ' || up.last_name), ''), 'User')::text AS target_display_name
FROM video_reviews r
LEFT JOIN user_preferences up ON up.user_id = r.author_id
WHERE r.id = $1;

-- name: ListModerationReports :many
SELECT *
FROM moderation_reports
WHERE
  (sqlc.arg(status_filter)::text = '' OR status = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(subject_type_filter)::text = '' OR subject_type = sqlc.arg(subject_type_filter)::text)
ORDER BY created_at DESC
LIMIT sqlc.arg(limit_count)
OFFSET sqlc.arg(offset_count);

-- name: GetModerationReport :one
SELECT *
FROM moderation_reports
WHERE id = $1;

-- name: UpdateModerationReportStatus :one
UPDATE moderation_reports
SET
  status = $2,
  resolved_by_user_id = $3,
  resolved_at = NOW(),
  updated_at = NOW()
WHERE id = $1
  AND status = 'open'
RETURNING *;

-- name: MarkModerationReportDiscordPosted :exec
UPDATE moderation_reports
SET
  discord_status = 'posted',
  discord_thread_id = $2,
  discord_message_id = $3,
  discord_error = '',
  updated_at = NOW()
WHERE id = $1;

-- name: MarkModerationReportDiscordFailed :exec
UPDATE moderation_reports
SET
  discord_status = 'failed',
  discord_error = $2,
  updated_at = NOW()
WHERE id = $1;

-- name: MarkModerationReportDiscordSkipped :exec
UPDATE moderation_reports
SET
  discord_status = 'skipped',
  discord_error = $2,
  updated_at = NOW()
WHERE id = $1;
