DROP TABLE IF EXISTS coaching_bookings;
DROP TABLE IF EXISTS coaching_blocked_slots;
DROP TABLE IF EXISTS coaching_availability;
DROP TABLE IF EXISTS coaching_session_types;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS timezone;
DROP TYPE IF EXISTS coaching_booking_status;
