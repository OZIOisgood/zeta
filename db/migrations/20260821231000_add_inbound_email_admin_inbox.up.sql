ALTER TABLE inbound_emails
    ADD COLUMN handling_status TEXT NOT NULL DEFAULT 'open'
        CHECK (handling_status IN ('open', 'replied', 'closed')),
    ADD COLUMN read_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN references_header TEXT NOT NULL DEFAULT '';

CREATE INDEX inbound_emails_handling_idx
    ON inbound_emails (handling_status, received_at DESC);

CREATE TABLE inbound_email_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbound_email_id UUID NOT NULL REFERENCES inbound_emails(id) ON DELETE CASCADE,
    idempotency_key UUID NOT NULL UNIQUE,
    resend_email_id TEXT NOT NULL DEFAULT '',
    sender_user_id TEXT NOT NULL,
    sender_display_name TEXT NOT NULL DEFAULT '',
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'sent', 'failed')),
    delivery_error TEXT NOT NULL DEFAULT '',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX inbound_email_replies_email_idx
    ON inbound_email_replies (inbound_email_id, created_at);
