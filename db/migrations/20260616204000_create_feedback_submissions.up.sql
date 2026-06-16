CREATE TABLE feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_display_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT NOT NULL CHECK (length(trim(message)) > 0),
    page_url TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    discord_status TEXT NOT NULL DEFAULT 'pending' CHECK (discord_status IN ('pending', 'posted', 'failed', 'skipped')),
    discord_channel_id TEXT NOT NULL DEFAULT '',
    discord_thread_id TEXT NOT NULL DEFAULT '',
    discord_message_id TEXT NOT NULL DEFAULT '',
    discord_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_submissions_created_at_idx ON feedback_submissions (created_at DESC);
CREATE INDEX feedback_submissions_user_id_idx ON feedback_submissions (user_id, created_at DESC);
