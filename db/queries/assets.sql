-- name: CreateAsset :one
INSERT INTO assets (name, description) VALUES ($1, $2) RETURNING *;
-- name: CreateVideo :one
INSERT INTO videos (asset_id, mux_upload_id, status) VALUES ($1, $2, $3) RETURNING *;
-- name: UpdateVideoMuxAssetID :exec
UPDATE videos SET mux_asset_id = $2, status = 'ready', updated_at = NOW() WHERE id = $1;
-- name: ListAssets :many
SELECT a.id, a.name, a.description, a.status, a.created_at, a.updated_at, COALESCE(v.playback_id, '') as playback_id, COALESCE(v.mux_upload_id, '') as mux_upload_id, COALESCE(v.mux_asset_id, '') as mux_asset_id FROM assets a LEFT JOIN LATERAL (SELECT playback_id, mux_upload_id, mux_asset_id FROM videos WHERE asset_id = a.id ORDER BY created_at ASC LIMIT 1) v ON true ORDER BY a.created_at DESC;
-- name: GetAsset :one
SELECT a.id, a.name, a.description, a.status, a.created_at, a.updated_at, COALESCE(v.playback_id, '') as playback_id, COALESCE(v.mux_upload_id, '') as mux_upload_id, COALESCE(v.mux_asset_id, '') as mux_asset_id FROM assets a LEFT JOIN LATERAL (SELECT playback_id, mux_upload_id, mux_asset_id FROM videos WHERE asset_id = a.id ORDER BY created_at ASC LIMIT 1) v ON true WHERE a.id = $1;
-- name: GetAssetVideos :many
SELECT id, mux_upload_id, mux_asset_id, playback_id, status, created_at FROM videos WHERE asset_id = $1 ORDER BY created_at ASC;
-- name: UpdateVideoStatus :exec
UPDATE videos SET mux_asset_id = $2, playback_id = $3, status = 'ready', updated_at = NOW() WHERE mux_upload_id = $1;
-- name: UpdateVideoStatusByUploadID :exec
UPDATE videos SET mux_asset_id = $2, playback_id = $3, status = 'ready', updated_at = NOW() WHERE mux_upload_id = $1;
