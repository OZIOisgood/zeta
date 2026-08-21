DROP TABLE IF EXISTS inbound_email_replies;

DROP INDEX IF EXISTS inbound_emails_handling_idx;

ALTER TABLE inbound_emails
    DROP COLUMN IF EXISTS references_header,
    DROP COLUMN IF EXISTS read_at,
    DROP COLUMN IF EXISTS handling_status;
