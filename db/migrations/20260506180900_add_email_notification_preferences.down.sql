ALTER TABLE user_preferences
DROP COLUMN IF EXISTS email_coaching_reminders_enabled,
DROP COLUMN IF EXISTS email_coaching_booking_updates_enabled,
DROP COLUMN IF EXISTS email_group_membership_updates_enabled,
DROP COLUMN IF EXISTS email_invitation_updates_enabled,
DROP COLUMN IF EXISTS email_asset_reviews_enabled,
DROP COLUMN IF EXISTS email_asset_uploads_enabled,
DROP COLUMN IF EXISTS email_notifications_enabled;
