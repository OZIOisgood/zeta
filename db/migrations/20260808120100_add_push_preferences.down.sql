ALTER TABLE user_preferences
DROP COLUMN IF EXISTS push_coaching_booking_updates_enabled,
DROP COLUMN IF EXISTS push_group_membership_updates_enabled,
DROP COLUMN IF EXISTS push_invitation_updates_enabled,
DROP COLUMN IF EXISTS push_asset_reviews_enabled,
DROP COLUMN IF EXISTS push_asset_uploads_enabled,
DROP COLUMN IF EXISTS push_notifications_enabled;
