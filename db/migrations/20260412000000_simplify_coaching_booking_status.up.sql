ALTER TABLE coaching_bookings
    ADD COLUMN is_cancelled BOOLEAN NOT NULL DEFAULT false;

UPDATE coaching_bookings
    SET is_cancelled = true WHERE status = 'cancelled';

ALTER TABLE coaching_bookings DROP COLUMN status;

DROP TYPE coaching_booking_status;
