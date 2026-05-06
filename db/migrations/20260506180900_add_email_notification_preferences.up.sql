ALTER TABLE user_preferences
ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN email_asset_uploads_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN email_asset_reviews_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN email_invitation_updates_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN email_group_membership_updates_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN email_coaching_booking_updates_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN email_coaching_reminders_enabled BOOLEAN NOT NULL DEFAULT true;
