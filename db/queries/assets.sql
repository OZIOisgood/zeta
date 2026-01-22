-- name: CreateAsset :one
INSERT INTO assets (name, description)
VALUES ($1, $2)
RETURNING *;

-- name: CreateVideo :one
INSERT INTO videos (asset_id, mux_upload_id, status)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateVideoMuxAssetID :exec
UPDATE videos
SET mux_asset_id = $2, status = 'ready', updated_at = NOW()
WHERE id = $1;
