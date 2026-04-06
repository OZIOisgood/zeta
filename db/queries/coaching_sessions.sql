-- name: CreateCoachingSession :one
INSERT INTO coaching_sessions (title, description, group_id, student_id, expert_id, scheduled_at, duration_minutes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: CreateCoachingSessionReminder :one
INSERT INTO coaching_session_reminders (session_id, reminder_24h_sent, reminder_1h_sent, reminder_15m_sent)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetCoachingSession :one
SELECT cs.*,
       g.name AS group_name
FROM coaching_sessions cs
JOIN groups g ON g.id = cs.group_id
WHERE cs.id = $1;

-- name: ListCoachingSessionsByStudent :many
SELECT cs.*,
       g.name AS group_name
FROM coaching_sessions cs
JOIN groups g ON g.id = cs.group_id
WHERE cs.student_id = $1
ORDER BY cs.scheduled_at DESC;

-- name: ListCoachingSessionsByExpert :many
SELECT cs.*,
       g.name AS group_name
FROM coaching_sessions cs
JOIN groups g ON g.id = cs.group_id
WHERE cs.expert_id = $1
ORDER BY cs.scheduled_at DESC;

-- name: ListCoachingSessionsAll :many
SELECT cs.*,
       g.name AS group_name
FROM coaching_sessions cs
JOIN groups g ON g.id = cs.group_id
ORDER BY cs.scheduled_at DESC;

-- name: UpdateCoachingSession :one
UPDATE coaching_sessions
SET title = $2, description = $3, scheduled_at = $4, duration_minutes = $5, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CancelCoachingSession :exec
UPDATE coaching_sessions
SET status = 'cancelled', updated_at = NOW()
WHERE id = $1;

-- name: UpdateCoachingSessionStatus :exec
UPDATE coaching_sessions
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: GetSessionsNeedingReminder24h :many
SELECT cs.id, cs.title, cs.description, cs.student_id, cs.expert_id, cs.scheduled_at, cs.duration_minutes,
       g.name AS group_name
FROM coaching_sessions cs
JOIN coaching_session_reminders csr ON csr.session_id = cs.id
JOIN groups g ON g.id = cs.group_id
WHERE cs.status = 'scheduled'
  AND NOT csr.reminder_24h_sent
  AND cs.scheduled_at BETWEEN NOW() + INTERVAL '23 hours 59 minutes' AND NOW() + INTERVAL '24 hours 1 minute';

-- name: GetSessionsNeedingReminder1h :many
SELECT cs.id, cs.title, cs.description, cs.student_id, cs.expert_id, cs.scheduled_at, cs.duration_minutes,
       g.name AS group_name
FROM coaching_sessions cs
JOIN coaching_session_reminders csr ON csr.session_id = cs.id
JOIN groups g ON g.id = cs.group_id
WHERE cs.status = 'scheduled'
  AND NOT csr.reminder_1h_sent
  AND cs.scheduled_at BETWEEN NOW() + INTERVAL '59 minutes' AND NOW() + INTERVAL '1 hour 1 minute';

-- name: GetSessionsNeedingReminder15m :many
SELECT cs.id, cs.title, cs.description, cs.student_id, cs.expert_id, cs.scheduled_at, cs.duration_minutes,
       g.name AS group_name
FROM coaching_sessions cs
JOIN coaching_session_reminders csr ON csr.session_id = cs.id
JOIN groups g ON g.id = cs.group_id
WHERE cs.status = 'scheduled'
  AND NOT csr.reminder_15m_sent
  AND cs.scheduled_at BETWEEN NOW() + INTERVAL '14 minutes' AND NOW() + INTERVAL '15 minutes 1 second';

-- name: MarkReminder24hSent :exec
UPDATE coaching_session_reminders SET reminder_24h_sent = TRUE WHERE session_id = $1;

-- name: MarkReminder1hSent :exec
UPDATE coaching_session_reminders SET reminder_1h_sent = TRUE WHERE session_id = $1;

-- name: MarkReminder15mSent :exec
UPDATE coaching_session_reminders SET reminder_15m_sent = TRUE WHERE session_id = $1;
