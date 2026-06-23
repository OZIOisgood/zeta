-- name: CountAdminUsers :one
SELECT COUNT(*)
FROM user_access ua
LEFT JOIN user_preferences up ON up.user_id = ua.user_id
WHERE (
    sqlc.arg(query)::text = ''
    OR ua.user_id = sqlc.arg(query)::text
    OR concat_ws(' ', up.first_name, up.last_name) ILIKE '%' || sqlc.arg(query)::text || '%'
)
AND (sqlc.arg(access_status)::text = '' OR ua.status::text = sqlc.arg(access_status)::text)
AND (NOT sqlc.arg(filter_role)::boolean OR ua.user_id = ANY(sqlc.arg(role_user_ids)::text[]));

-- name: ListAdminUsers :many
SELECT
    ua.user_id,
    ua.status,
    ua.activated_at,
    ua.created_at,
    COALESCE(up.first_name, '')::text AS first_name,
    COALESCE(up.last_name, '')::text AS last_name,
    COALESCE(up.avatar, '')::text AS avatar
FROM user_access ua
LEFT JOIN user_preferences up ON up.user_id = ua.user_id
WHERE (
    sqlc.arg(query)::text = ''
    OR ua.user_id = sqlc.arg(query)::text
    OR concat_ws(' ', up.first_name, up.last_name) ILIKE '%' || sqlc.arg(query)::text || '%'
)
AND (sqlc.arg(access_status)::text = '' OR ua.status::text = sqlc.arg(access_status)::text)
AND (NOT sqlc.arg(filter_role)::boolean OR ua.user_id = ANY(sqlc.arg(role_user_ids)::text[]))
ORDER BY ua.created_at DESC NULLS LAST, ua.user_id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountAdminVideos :one
SELECT COUNT(*)
FROM assets a
JOIN groups g ON g.id = a.group_id
WHERE (sqlc.arg(query)::text = '' OR a.name ILIKE '%' || sqlc.arg(query)::text || '%' OR a.id::text = sqlc.arg(query)::text)
  AND (sqlc.arg(owner_id)::text = '' OR a.owner_id = sqlc.arg(owner_id)::text)
  AND (sqlc.arg(expert_id)::text = '' OR g.owner_id = sqlc.arg(expert_id)::text)
  AND (sqlc.arg(group_id)::text = '' OR a.group_id::text = sqlc.arg(group_id)::text)
  AND (sqlc.arg(asset_status)::text = '' OR a.status::text = sqlc.arg(asset_status)::text)
  AND (sqlc.arg(created_from)::timestamptz IS NULL OR a.created_at >= sqlc.arg(created_from)::timestamptz)
  AND (sqlc.arg(created_to)::timestamptz IS NULL OR a.created_at < sqlc.arg(created_to)::timestamptz);

-- name: ListAdminVideos :many
SELECT
    a.id,
    a.name,
    a.description,
    a.status,
    a.owner_id,
    a.group_id,
    g.name AS group_name,
    g.owner_id AS expert_id,
    a.created_at,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', v.id,
                'status', v.status,
                'mux_upload_id', COALESCE(v.mux_upload_id, ''),
                'mux_asset_id', COALESCE(v.mux_asset_id, ''),
                'playback_id', COALESCE(v.playback_id, ''),
                'duration_seconds', v.duration_seconds,
                'created_at', v.created_at
            ) ORDER BY v.created_at, v.id
        ) FILTER (WHERE v.id IS NOT NULL),
        '[]'::jsonb
    ) AS videos
FROM assets a
JOIN groups g ON g.id = a.group_id
LEFT JOIN videos v ON v.asset_id = a.id
WHERE (sqlc.arg(query)::text = '' OR a.name ILIKE '%' || sqlc.arg(query)::text || '%' OR a.id::text = sqlc.arg(query)::text)
  AND (sqlc.arg(owner_id)::text = '' OR a.owner_id = sqlc.arg(owner_id)::text)
  AND (sqlc.arg(expert_id)::text = '' OR g.owner_id = sqlc.arg(expert_id)::text)
  AND (sqlc.arg(group_id)::text = '' OR a.group_id::text = sqlc.arg(group_id)::text)
  AND (sqlc.arg(asset_status)::text = '' OR a.status::text = sqlc.arg(asset_status)::text)
  AND (sqlc.arg(created_from)::timestamptz IS NULL OR a.created_at >= sqlc.arg(created_from)::timestamptz)
  AND (sqlc.arg(created_to)::timestamptz IS NULL OR a.created_at < sqlc.arg(created_to)::timestamptz)
GROUP BY a.id, g.id
ORDER BY a.created_at DESC, a.id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountAdminSessions :one
SELECT COUNT(*)
FROM coaching_bookings cb
WHERE (sqlc.arg(expert_id)::text = '' OR cb.expert_id = sqlc.arg(expert_id)::text)
  AND (sqlc.arg(student_id)::text = '' OR cb.student_id = sqlc.arg(student_id)::text)
  AND (sqlc.arg(group_id)::text = '' OR cb.group_id::text = sqlc.arg(group_id)::text)
  AND (sqlc.arg(session_status)::text = '' OR
       CASE WHEN cb.is_cancelled THEN 'cancelled'
            WHEN cb.scheduled_at + cb.duration_minutes * interval '1 minute' < NOW() THEN 'done'
            ELSE 'upcoming' END = sqlc.arg(session_status)::text)
  AND (sqlc.arg(scheduled_from)::timestamptz IS NULL OR cb.scheduled_at >= sqlc.arg(scheduled_from)::timestamptz)
  AND (sqlc.arg(scheduled_to)::timestamptz IS NULL OR cb.scheduled_at < sqlc.arg(scheduled_to)::timestamptz);

-- name: ListAdminSessions :many
SELECT
    cb.id,
    cb.expert_id,
    cb.student_id,
    cb.group_id,
    g.name AS group_name,
    cst.name AS session_type_name,
    cb.scheduled_at,
    cb.duration_minutes,
    cb.is_cancelled,
    cb.cancellation_reason,
    cb.created_at,
    CASE WHEN cb.is_cancelled THEN 'cancelled'
         WHEN cb.scheduled_at + cb.duration_minutes * interval '1 minute' < NOW() THEN 'done'
         ELSE 'upcoming' END::text AS status,
    COALESCE(ri.status::text, r.status::text, '')::text AS recording_status,
    ri.asset_id AS recording_asset_id
FROM coaching_bookings cb
JOIN groups g ON g.id = cb.group_id
JOIN coaching_session_types cst ON cst.id = cb.session_type_id
LEFT JOIN coaching_booking_recordings r ON r.booking_id = cb.id
LEFT JOIN coaching_recording_imports ri ON ri.booking_id = cb.id
WHERE (sqlc.arg(expert_id)::text = '' OR cb.expert_id = sqlc.arg(expert_id)::text)
  AND (sqlc.arg(student_id)::text = '' OR cb.student_id = sqlc.arg(student_id)::text)
  AND (sqlc.arg(group_id)::text = '' OR cb.group_id::text = sqlc.arg(group_id)::text)
  AND (sqlc.arg(session_status)::text = '' OR
       CASE WHEN cb.is_cancelled THEN 'cancelled'
            WHEN cb.scheduled_at + cb.duration_minutes * interval '1 minute' < NOW() THEN 'done'
            ELSE 'upcoming' END = sqlc.arg(session_status)::text)
  AND (sqlc.arg(scheduled_from)::timestamptz IS NULL OR cb.scheduled_at >= sqlc.arg(scheduled_from)::timestamptz)
  AND (sqlc.arg(scheduled_to)::timestamptz IS NULL OR cb.scheduled_at < sqlc.arg(scheduled_to)::timestamptz)
ORDER BY cb.scheduled_at DESC, cb.id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: ListAdminUserOptions :many
SELECT
    ua.user_id,
    COALESCE(NULLIF(trim(concat_ws(' ', up.first_name, up.last_name)), ''), ua.user_id)::text AS label
FROM user_access ua
LEFT JOIN user_preferences up ON up.user_id = ua.user_id
WHERE sqlc.arg(query)::text = ''
   OR ua.user_id = sqlc.arg(query)::text
   OR concat_ws(' ', up.first_name, up.last_name) ILIKE '%' || sqlc.arg(query)::text || '%'
ORDER BY label, ua.user_id
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: ListAdminGroupOptions :many
SELECT id, name
FROM groups
WHERE sqlc.arg(query)::text = '' OR id::text = sqlc.arg(query)::text OR name ILIKE '%' || sqlc.arg(query)::text || '%'
ORDER BY name, id
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountAdminActivity :one
SELECT COUNT(*)
FROM audit_events
WHERE (sqlc.arg(actor_id)::text = '' OR actor_id = sqlc.arg(actor_id)::text)
  AND (sqlc.arg(action)::text = '' OR action = sqlc.arg(action)::text)
  AND (sqlc.arg(resource_type)::text = '' OR resource_type = sqlc.arg(resource_type)::text)
  AND (sqlc.arg(occurred_from)::timestamptz IS NULL OR occurred_at >= sqlc.arg(occurred_from)::timestamptz)
  AND (sqlc.arg(occurred_to)::timestamptz IS NULL OR occurred_at < sqlc.arg(occurred_to)::timestamptz);

-- name: ListAdminActivity :many
SELECT id, occurred_at, actor_id, actor_type, actor_label, action, resource_type, resource_id, group_id
FROM audit_events
WHERE (sqlc.arg(actor_id)::text = '' OR actor_id = sqlc.arg(actor_id)::text)
  AND (sqlc.arg(action)::text = '' OR action = sqlc.arg(action)::text)
  AND (sqlc.arg(resource_type)::text = '' OR resource_type = sqlc.arg(resource_type)::text)
  AND (sqlc.arg(occurred_from)::timestamptz IS NULL OR occurred_at >= sqlc.arg(occurred_from)::timestamptz)
  AND (sqlc.arg(occurred_to)::timestamptz IS NULL OR occurred_at < sqlc.arg(occurred_to)::timestamptz)
ORDER BY occurred_at DESC, id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;
