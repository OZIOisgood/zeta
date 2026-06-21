-- name: CreateLandingContactSubmission :one
INSERT INTO landing_contact_submissions (
  name,
  email,
  message,
  locale,
  page_url,
  user_agent
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
RETURNING *;

-- name: MarkLandingContactEmailSent :exec
UPDATE landing_contact_submissions
SET
  email_status = 'sent',
  resend_email_id = $2,
  email_error = '',
  updated_at = NOW()
WHERE id = $1;

-- name: MarkLandingContactEmailFailed :exec
UPDATE landing_contact_submissions
SET
  email_status = 'failed',
  email_error = $2,
  updated_at = NOW()
WHERE id = $1;
