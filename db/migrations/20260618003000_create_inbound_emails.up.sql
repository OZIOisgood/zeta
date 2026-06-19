CREATE TABLE inbound_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resend_email_id TEXT NOT NULL UNIQUE,
    svix_id TEXT NOT NULL DEFAULT '',
    inbox TEXT NOT NULL CHECK (inbox IN ('social', 'support', 'dsa')),
    inbox_address TEXT NOT NULL,
    sender TEXT NOT NULL,
    recipients TEXT[] NOT NULL DEFAULT '{}',
    cc TEXT[] NOT NULL DEFAULT '{}',
    bcc TEXT[] NOT NULL DEFAULT '{}',
    subject TEXT NOT NULL DEFAULT '',
    message_id TEXT NOT NULL DEFAULT '',
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    body_text TEXT NOT NULL DEFAULT '',
    attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
    processing_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    claim_until TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    discord_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (discord_status IN ('pending', 'posted', 'failed', 'skipped')),
    discord_channel_id TEXT NOT NULL DEFAULT '',
    discord_thread_id TEXT NOT NULL DEFAULT '',
    discord_message_id TEXT NOT NULL DEFAULT '',
    discord_error TEXT NOT NULL DEFAULT '',
    forwarding_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (forwarding_status IN ('pending', 'forwarded', 'failed', 'skipped')),
    forwarding_email_id TEXT NOT NULL DEFAULT '',
    forwarding_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX inbound_emails_processing_idx
    ON inbound_emails (processing_status, next_attempt_at, received_at)
    WHERE processing_status IN ('pending', 'failed');
CREATE INDEX inbound_emails_received_at_idx ON inbound_emails (received_at DESC);
CREATE INDEX inbound_emails_inbox_received_at_idx ON inbound_emails (inbox, received_at DESC);
CREATE UNIQUE INDEX inbound_emails_svix_id_idx ON inbound_emails (svix_id) WHERE svix_id <> '';
