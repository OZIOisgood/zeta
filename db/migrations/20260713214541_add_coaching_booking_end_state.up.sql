ALTER TABLE coaching_bookings
    ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN ended_by TEXT;
