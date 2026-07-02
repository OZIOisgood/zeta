-- name: CreateFeedbackSubmission :one
INSERT INTO feedback_submissions (
  user_id,
  user_display_name,
  rating,
  message,
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
  $7
)
RETURNING *;

-- name: MarkFeedbackDiscordPosted :exec
UPDATE feedback_submissions
SET
  discord_status = 'posted',
  discord_thread_id = $2,
  discord_message_id = $3,
  discord_error = '',
  updated_at = NOW()
WHERE id = $1;

-- name: MarkFeedbackDiscordFailed :exec
UPDATE feedback_submissions
SET
  discord_status = 'failed',
  discord_error = $2,
  updated_at = NOW()
WHERE id = $1;

-- name: MarkFeedbackDiscordSkipped :exec
UPDATE feedback_submissions
SET
  discord_status = 'skipped',
  discord_error = $2,
  updated_at = NOW()
WHERE id = $1;
