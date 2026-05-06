ALTER TABLE coaching_bookings
    DROP CONSTRAINT IF EXISTS coaching_bookings_duration_minutes_check,
    ADD CONSTRAINT coaching_bookings_duration_minutes_check
        CHECK (duration_minutes >= 15 AND duration_minutes <= 120);

ALTER TABLE coaching_session_types
    DROP CONSTRAINT IF EXISTS coaching_session_types_duration_minutes_check,
    ADD CONSTRAINT coaching_session_types_duration_minutes_check
        CHECK (duration_minutes >= 15 AND duration_minutes <= 120);
