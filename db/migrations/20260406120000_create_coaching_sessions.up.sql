CREATE TYPE coaching_session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE coaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id VARCHAR(255) NOT NULL,
    expert_id VARCHAR(255) NOT NULL,
    status coaching_session_status NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coaching_sessions_student ON coaching_sessions(student_id);
CREATE INDEX idx_coaching_sessions_expert ON coaching_sessions(expert_id);
CREATE INDEX idx_coaching_sessions_group ON coaching_sessions(group_id);
CREATE INDEX idx_coaching_sessions_scheduled ON coaching_sessions(scheduled_at);

CREATE TABLE coaching_session_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
    reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_1h_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_15m_sent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX idx_coaching_session_reminders_session ON coaching_session_reminders(session_id);
