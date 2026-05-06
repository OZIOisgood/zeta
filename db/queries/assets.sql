-- name: CreateAsset :one
INSERT INTO assets (name, description, group_id, owner_id) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: CreateVideo :one
INSERT INTO videos (asset_id, mux_upload_id, status) VALUES ($1, $2, $3) RETURNING *;

-- name: CreateVideoFromMuxAsset :one
INSERT INTO videos (asset_id, mux_upload_id, mux_asset_id, playback_id, status)
VALUES ($1, '', $2, $3, 'ready')
RETURNING *;

-- name: UpdateAssetStatus :exec
UPDATE assets SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: UpdateVideoMuxAssetID :exec
UPDATE videos SET mux_asset_id = $2, status = 'ready', updated_at = NOW() WHERE id = $1;

-- name: ListVisibleAssets :many
SELECT
    a.id,
    a.name,
    a.description,
    a.status,
    a.created_at,
    a.updated_at,
    a.owner_id,
    COALESCE(v.playback_id, '') as playback_id,
    COALESCE(v.mux_upload_id, '') as mux_upload_id,
    COALESCE(v.mux_asset_id, '') as mux_asset_id,
    COALESCE(rv.review_count, 0)::bigint as review_count
FROM assets a
LEFT JOIN LATERAL (
    SELECT playback_id, mux_upload_id, mux_asset_id
    FROM videos
    WHERE asset_id = a.id
    ORDER BY created_at ASC
    LIMIT 1
) v ON true
LEFT JOIN LATERAL (
    SELECT COUNT(r.id) as review_count
    FROM videos review_videos
    LEFT JOIN video_reviews r ON r.video_id = review_videos.id
    WHERE review_videos.asset_id = a.id
) rv ON true
WHERE a.status != 'waiting_upload'
  AND (
    (sqlc.arg(is_student)::boolean AND a.owner_id = sqlc.arg(user_id))
    OR (
      NOT sqlc.arg(is_student)::boolean
      AND EXISTS (
        SELECT 1
        FROM user_groups ug
        WHERE ug.user_id = sqlc.arg(user_id)
          AND ug.group_id = a.group_id
      )
    )
  )
ORDER BY a.created_at DESC;

-- name: GetAsset :one
SELECT a.id, a.name, a.description, a.status, a.created_at, a.updated_at, a.owner_id, a.group_id, COALESCE(v.playback_id, '') as playback_id, COALESCE(v.mux_upload_id, '') as mux_upload_id, COALESCE(v.mux_asset_id, '') as mux_asset_id, g.name as group_name, g.avatar as group_avatar FROM assets a LEFT JOIN LATERAL (SELECT playback_id, mux_upload_id, mux_asset_id FROM videos WHERE asset_id = a.id ORDER BY created_at ASC LIMIT 1) v ON true LEFT JOIN groups g ON g.id = a.group_id WHERE a.id = $1;

-- name: GetVisibleAsset :one
SELECT a.id, a.name, a.description, a.status, a.created_at, a.updated_at, a.owner_id, a.group_id, COALESCE(v.playback_id, '') as playback_id, COALESCE(v.mux_upload_id, '') as mux_upload_id, COALESCE(v.mux_asset_id, '') as mux_asset_id, g.name as group_name, g.avatar as group_avatar
FROM assets a
LEFT JOIN LATERAL (
    SELECT playback_id, mux_upload_id, mux_asset_id
    FROM videos
    WHERE asset_id = a.id
    ORDER BY created_at ASC
    LIMIT 1
) v ON true
LEFT JOIN groups g ON g.id = a.group_id
WHERE a.id = sqlc.arg(asset_id)
  AND (
    (sqlc.arg(is_student)::boolean AND a.owner_id = sqlc.arg(user_id))
    OR (
      NOT sqlc.arg(is_student)::boolean
      AND EXISTS (
        SELECT 1
        FROM user_groups ug
        WHERE ug.user_id = sqlc.arg(user_id)
          AND ug.group_id = a.group_id
      )
    )
  );

-- name: GetAssetVideos :many
SELECT v.id, v.mux_upload_id, v.mux_asset_id, v.playback_id, v.status, v.created_at, COUNT(r.id) as review_count
FROM videos v
LEFT JOIN video_reviews r ON v.id = r.video_id
WHERE v.asset_id = $1
GROUP BY v.id
ORDER BY v.created_at ASC;

-- name: UpdateVideoStatus :exec
UPDATE videos SET mux_asset_id = $2, playback_id = $3, status = 'ready', updated_at = NOW() WHERE mux_upload_id = $1;

-- name: UpdateVideoStatusByUploadID :exec
UPDATE videos SET mux_asset_id = $2, playback_id = $3, status = 'ready', updated_at = NOW() WHERE mux_upload_id = $1;
