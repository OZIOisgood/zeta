DROP TABLE IF EXISTS coaching_bookings;
DROP TABLE IF EXISTS coaching_blocked_slots;
DROP TABLE IF EXISTS coaching_availability;
DROP TABLE IF EXISTS coaching_session_types;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS timezone;

-- Revert group avatar from TEXT back to BYTEA
ALTER TABLE groups ALTER COLUMN avatar DROP DEFAULT;
ALTER TABLE groups ALTER COLUMN avatar DROP NOT NULL;
ALTER TABLE groups ALTER COLUMN avatar TYPE BYTEA USING decode(avatar, 'base64');
