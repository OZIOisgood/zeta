-- Add CHECK constraints and index for coaching tables

-- coaching_availability: start_time must be before end_time
ALTER TABLE coaching_availability
    ADD CONSTRAINT chk_availability_time_order CHECK (start_time < end_time);

-- coaching_blocked_slots: start_time and end_time must both be NULL or both non-NULL,
-- and when provided, start_time must be before end_time
ALTER TABLE coaching_blocked_slots
    ADD CONSTRAINT chk_blocked_slot_time_pair
        CHECK (
            (start_time IS NULL AND end_time IS NULL)
            OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
        );

-- coaching_bookings: duration must be within valid session range
ALTER TABLE coaching_bookings
    ADD CONSTRAINT chk_booking_duration
        CHECK (duration_minutes >= 15 AND duration_minutes <= 120);

-- Index to speed up session_type_id lookups on bookings
CREATE INDEX idx_coaching_bookings_session_type ON coaching_bookings(session_type_id);
