CREATE TABLE moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id TEXT NOT NULL,
    reporter_display_name TEXT NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('review_comment', 'user')),
    target_review_id UUID REFERENCES video_reviews(id) ON DELETE SET NULL,
    target_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    target_user_id TEXT NOT NULL DEFAULT '',
    target_display_name TEXT NOT NULL DEFAULT '',
    target_review_content TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL CHECK (reason IN ('harassment', 'spam', 'inappropriate_content', 'other')),
    details TEXT NOT NULL DEFAULT '',
    page_url TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
    resolved_by_user_id TEXT NOT NULL DEFAULT '',
    resolved_at TIMESTAMP WITH TIME ZONE,
    discord_status TEXT NOT NULL DEFAULT 'pending' CHECK (discord_status IN ('pending', 'posted', 'failed', 'skipped')),
    discord_channel_id TEXT NOT NULL DEFAULT '',
    discord_thread_id TEXT NOT NULL DEFAULT '',
    discord_message_id TEXT NOT NULL DEFAULT '',
    discord_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX moderation_reports_status_created_at_idx ON moderation_reports (status, created_at DESC);
CREATE INDEX moderation_reports_target_review_id_idx ON moderation_reports (target_review_id);
CREATE INDEX moderation_reports_target_user_id_idx ON moderation_reports (target_user_id, created_at DESC);
CREATE INDEX moderation_reports_reporter_user_id_idx ON moderation_reports (reporter_user_id, created_at DESC);
