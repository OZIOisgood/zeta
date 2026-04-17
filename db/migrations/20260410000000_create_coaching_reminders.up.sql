CREATE TABLE IF NOT EXISTS coaching_booking_reminders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES coaching_bookings(id) ON DELETE CASCADE,
    remind_at   TIMESTAMPTZ NOT NULL,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_booking_reminders_pending
    ON coaching_booking_reminders (remind_at)
    WHERE sent_at IS NULL;

CREATE INDEX idx_coaching_booking_reminders_booking_id
    ON coaching_booking_reminders (booking_id);
