-- name: UpsertInboundEmail :one
INSERT INTO inbound_emails (
  resend_email_id,
  svix_id,
  inbox,
  inbox_address,
  sender,
  recipients,
  cc,
  bcc,
  subject,
  message_id,
  received_at,
  discord_channel_id,
  forwarding_status
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
ON CONFLICT (resend_email_id) DO UPDATE SET
  svix_id = CASE WHEN inbound_emails.svix_id = '' THEN EXCLUDED.svix_id ELSE inbound_emails.svix_id END,
  inbox = EXCLUDED.inbox,
  inbox_address = EXCLUDED.inbox_address,
  sender = EXCLUDED.sender,
  recipients = EXCLUDED.recipients,
  cc = EXCLUDED.cc,
  bcc = EXCLUDED.bcc,
  subject = EXCLUDED.subject,
  message_id = EXCLUDED.message_id,
  received_at = EXCLUDED.received_at,
  discord_channel_id = EXCLUDED.discord_channel_id,
  updated_at = NOW()
RETURNING *;

-- name: ClaimInboundEmailByResendID :one
WITH candidate AS (
  SELECT pending.id
  FROM inbound_emails AS pending
  WHERE pending.resend_email_id = $1
    AND pending.processing_status IN ('pending', 'failed')
    AND pending.next_attempt_at <= NOW()
    AND (pending.claim_until IS NULL OR pending.claim_until <= NOW())
    AND pending.processing_attempts < 10
  FOR UPDATE SKIP LOCKED
)
UPDATE inbound_emails AS email
SET
  processing_status = 'processing',
  processing_attempts = processing_attempts + 1,
  last_attempt_at = NOW(),
  claim_until = NOW() + INTERVAL '5 minutes',
  updated_at = NOW()
FROM candidate
WHERE email.id = candidate.id
RETURNING email.*;

-- name: ClaimPendingInboundEmails :many
WITH candidates AS (
  SELECT pending.id
  FROM inbound_emails AS pending
  WHERE pending.processing_status IN ('pending', 'failed')
    AND pending.next_attempt_at <= NOW()
    AND (pending.claim_until IS NULL OR pending.claim_until <= NOW())
    AND pending.processing_attempts < 10
  ORDER BY pending.next_attempt_at, pending.received_at
  FOR UPDATE SKIP LOCKED
  LIMIT $1
)
UPDATE inbound_emails AS email
SET
  processing_status = 'processing',
  processing_attempts = processing_attempts + 1,
  last_attempt_at = NOW(),
  claim_until = NOW() + INTERVAL '5 minutes',
  updated_at = NOW()
FROM candidates
WHERE email.id = candidates.id
RETURNING email.*;

-- name: UpdateInboundEmailContent :exec
UPDATE inbound_emails
SET
  sender = $2,
  recipients = $3,
  cc = $4,
  bcc = $5,
  subject = $6,
  message_id = $7,
  received_at = $8,
  body_text = $9,
  attachments = $10,
  updated_at = NOW()
WHERE id = $1;

-- name: MarkInboundEmailDiscordPosted :exec
UPDATE inbound_emails
SET
  discord_status = 'posted',
  discord_thread_id = $2,
  discord_message_id = $3,
  discord_error = '',
  updated_at = NOW()
WHERE id = $1 AND discord_status <> 'posted';

-- name: MarkInboundEmailDiscordFailed :exec
UPDATE inbound_emails
SET
  discord_status = 'failed',
  discord_error = $2,
  updated_at = NOW()
WHERE id = $1 AND discord_status <> 'posted';

-- name: MarkInboundEmailDiscordSkipped :exec
UPDATE inbound_emails
SET
  discord_status = 'skipped',
  discord_error = $2,
  updated_at = NOW()
WHERE id = $1 AND discord_status <> 'posted';

-- name: MarkInboundEmailForwarded :exec
UPDATE inbound_emails
SET
  forwarding_status = 'forwarded',
  forwarding_email_id = $2,
  forwarding_error = '',
  updated_at = NOW()
WHERE id = $1 AND forwarding_status <> 'forwarded';

-- name: MarkInboundEmailForwardingFailed :exec
UPDATE inbound_emails
SET
  forwarding_status = 'failed',
  forwarding_error = $2,
  updated_at = NOW()
WHERE id = $1 AND forwarding_status <> 'forwarded';

-- name: MarkInboundEmailForwardingSkipped :exec
UPDATE inbound_emails
SET
  forwarding_status = 'skipped',
  forwarding_error = $2,
  updated_at = NOW()
WHERE id = $1 AND forwarding_status <> 'forwarded';

-- name: ReleaseInboundEmailClaim :exec
UPDATE inbound_emails
SET
  processing_status = CASE
    WHEN discord_status IN ('posted', 'skipped')
      AND forwarding_status IN ('forwarded', 'skipped') THEN 'processed'
    ELSE 'failed'
  END,
  processed_at = CASE
    WHEN discord_status IN ('posted', 'skipped')
      AND forwarding_status IN ('forwarded', 'skipped') THEN NOW()
    ELSE processed_at
  END,
  next_attempt_at = CASE
    WHEN discord_status IN ('posted', 'skipped')
      AND forwarding_status IN ('forwarded', 'skipped') THEN next_attempt_at
    ELSE NOW() + LEAST(60, CAST(POWER(2, LEAST(processing_attempts, 6)) AS INTEGER)) * INTERVAL '1 minute'
  END,
  claim_until = NULL,
  updated_at = NOW()
WHERE id = $1;
