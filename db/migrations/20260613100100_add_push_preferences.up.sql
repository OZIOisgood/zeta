ALTER TABLE user_preferences
ADD COLUMN push_notifications_enabled           BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN push_asset_uploads_enabled           BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN push_asset_reviews_enabled           BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN push_invitation_updates_enabled      BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN push_group_membership_updates_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN push_coaching_booking_updates_enabled BOOLEAN NOT NULL DEFAULT true;
