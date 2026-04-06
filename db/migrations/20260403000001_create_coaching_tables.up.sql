CREATE TYPE coaching_booking_status AS ENUM (
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);

ALTER TABLE user_preferences ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';

CREATE TABLE coaching_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL CHECK (slot_duration_minutes IN (15, 30, 45, 60)),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_availability_expert_group ON coaching_availability(expert_id, group_id);

CREATE TABLE coaching_blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    blocked_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_blocked_slots_expert ON coaching_blocked_slots(expert_id, blocked_date);

CREATE TABLE coaching_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status coaching_booking_status NOT NULL DEFAULT 'confirmed',
    cancellation_reason TEXT,
    cancelled_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_bookings_expert ON coaching_bookings(expert_id, scheduled_at);
CREATE INDEX idx_coaching_bookings_student ON coaching_bookings(student_id, scheduled_at);
CREATE INDEX idx_coaching_bookings_group ON coaching_bookings(group_id, scheduled_at);
