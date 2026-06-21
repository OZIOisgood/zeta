CREATE TABLE landing_contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    email TEXT NOT NULL CHECK (length(trim(email)) > 0),
    message TEXT NOT NULL CHECK (length(trim(message)) > 0),
    locale TEXT NOT NULL DEFAULT '',
    page_url TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
    resend_email_id TEXT NOT NULL DEFAULT '',
    email_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX landing_contact_submissions_created_at_idx
    ON landing_contact_submissions (created_at DESC);

