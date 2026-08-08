-- Renumbered from 20260613100100 — see 20260808120000_create_user_devices.up.sql.
-- IF NOT EXISTS keeps the re-run a no-op on local DBs that applied the old stamp.
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS push_notifications_enabled            BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_asset_uploads_enabled            BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_asset_reviews_enabled            BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_invitation_updates_enabled       BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_group_membership_updates_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_coaching_booking_updates_enabled BOOLEAN NOT NULL DEFAULT true;
