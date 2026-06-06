-- Reports list a user's own video uploads and live coaching sessions as
-- individual events. The frontend ports buildReport(): it nests events by
-- group then leaf (student for experts, expert for students), aggregates totals,
-- and filters by the selected month/quarter/year period — so these queries
-- return the full history with no period/timezone bucketing.
-- Visibility is enforced by always scoping on the requesting user's own id.

-- name: ReportUploadEventsForExpert :many
-- One row per asset uploaded into a group the expert owns. The reviewing expert
-- is the group owner; the student is the asset owner. Duration sums the asset's
-- video parts.
SELECT
    a.id AS asset_id,
    a.name AS title,
    a.created_at AS at,
    a.group_id,
    g.name AS group_name,
    a.owner_id AS student_id,
    g.owner_id AS expert_id,
    COALESCE(SUM(v.duration_seconds), 0)::double precision AS duration_seconds
FROM assets a
JOIN groups g ON g.id = a.group_id
LEFT JOIN videos v ON v.asset_id = a.id
WHERE g.owner_id = @expert_id
  AND a.status != 'waiting_upload'
GROUP BY a.id, a.name, a.created_at, a.group_id, g.name, a.owner_id, g.owner_id
ORDER BY a.created_at DESC;

-- name: ReportUploadEventsForStudent :many
-- One row per asset the student uploaded. The reviewing expert is the group owner.
SELECT
    a.id AS asset_id,
    a.name AS title,
    a.created_at AS at,
    a.group_id,
    g.name AS group_name,
    a.owner_id AS student_id,
    g.owner_id AS expert_id,
    COALESCE(SUM(v.duration_seconds), 0)::double precision AS duration_seconds
FROM assets a
JOIN groups g ON g.id = a.group_id
LEFT JOIN videos v ON v.asset_id = a.id
WHERE a.owner_id = @student_id
  AND a.status != 'waiting_upload'
GROUP BY a.id, a.name, a.created_at, a.group_id, g.name, a.owner_id, g.owner_id
ORDER BY a.created_at DESC;

-- name: ReportSessionEventsForExpert :many
-- Past, non-cancelled sessions the expert ran. Title is the session type name.
SELECT
    cb.id AS booking_id,
    COALESCE(cst.name, '') AS title,
    cb.scheduled_at AS at,
    cb.group_id,
    g.name AS group_name,
    cb.student_id,
    cb.expert_id,
    cb.duration_minutes
FROM coaching_bookings cb
JOIN groups g ON g.id = cb.group_id
LEFT JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE cb.expert_id = @expert_id
  AND cb.is_cancelled = false
  AND cb.scheduled_at < NOW()
ORDER BY cb.scheduled_at DESC;

-- name: ReportSessionEventsForStudent :many
-- Past, non-cancelled sessions the student attended. Title is the session type name.
SELECT
    cb.id AS booking_id,
    COALESCE(cst.name, '') AS title,
    cb.scheduled_at AS at,
    cb.group_id,
    g.name AS group_name,
    cb.student_id,
    cb.expert_id,
    cb.duration_minutes
FROM coaching_bookings cb
JOIN groups g ON g.id = cb.group_id
LEFT JOIN coaching_session_types cst ON cst.id = cb.session_type_id
WHERE cb.student_id = @student_id
  AND cb.is_cancelled = false
  AND cb.scheduled_at < NOW()
ORDER BY cb.scheduled_at DESC;
