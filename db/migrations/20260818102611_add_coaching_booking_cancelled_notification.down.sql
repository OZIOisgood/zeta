DELETE FROM notifications WHERE type = 'coaching_booking_cancelled';

ALTER TYPE notification_type RENAME TO notification_type_old;
CREATE TYPE notification_type AS ENUM (
    'group_invitation_received',
    'group_member_joined',
    'video_reviewed',
    'video_uploaded',
    'coaching_booking_created'
);
ALTER TABLE notifications
    ALTER COLUMN type TYPE notification_type USING type::text::notification_type;
DROP TYPE notification_type_old;
