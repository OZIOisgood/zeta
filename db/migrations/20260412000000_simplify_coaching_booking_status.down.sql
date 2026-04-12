CREATE TYPE coaching_booking_status AS ENUM ('confirmed', 'cancelled');

ALTER TABLE coaching_bookings
    ADD COLUMN status coaching_booking_status NOT NULL DEFAULT 'confirmed';

UPDATE coaching_bookings
    SET status = 'cancelled' WHERE is_cancelled = true;

ALTER TABLE coaching_bookings DROP COLUMN is_cancelled;
