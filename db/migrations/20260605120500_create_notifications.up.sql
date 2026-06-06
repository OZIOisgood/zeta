CREATE TYPE notification_type AS ENUM (
    'group_invitation_received',
    'group_member_joined',
    'video_reviewed',
    'video_uploaded',
    'coaching_booking_created'
);

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id TEXT NOT NULL,
    type         notification_type NOT NULL,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at      TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);

-- Push signal for SSE delivery: every insert emits a NOTIFY so any API instance
-- holding a LISTEN connection can fan the event out to its connected clients.
CREATE FUNCTION notify_notification_created() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'notifications',
        json_build_object('id', NEW.id, 'recipient_id', NEW.recipient_id)::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_notify_created
    AFTER INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION notify_notification_created();
