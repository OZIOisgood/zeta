CREATE TYPE coaching_recording_status AS ENUM (
    'starting',
    'started',
    'stopping',
    'stopped',
    'failed'
);

CREATE TABLE coaching_booking_recordings (
    booking_id UUID PRIMARY KEY REFERENCES coaching_bookings(id) ON DELETE CASCADE,
    status coaching_recording_status NOT NULL DEFAULT 'starting',
    resource_id TEXT,
    sid TEXT,
    uid TEXT,
    file_prefix TEXT[],
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_booking_recordings_active
    ON coaching_booking_recordings (status, booking_id)
    WHERE status IN ('starting', 'started', 'stopping');
