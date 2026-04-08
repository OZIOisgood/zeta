-- Revert CHECK constraints and index for coaching tables

DROP INDEX IF EXISTS idx_coaching_bookings_session_type;

ALTER TABLE coaching_bookings
    DROP CONSTRAINT IF EXISTS chk_booking_duration;

ALTER TABLE coaching_blocked_slots
    DROP CONSTRAINT IF EXISTS chk_blocked_slot_time_pair;

ALTER TABLE coaching_availability
    DROP CONSTRAINT IF EXISTS chk_availability_time_order;
