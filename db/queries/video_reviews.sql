-- name: CreateVideoReview :one
INSERT INTO video_reviews (
    video_id,
    content
) VALUES (
    $1, $2
) RETURNING *;

-- name: ListVideoReviews :many
SELECT 
    id,
    video_id,
    content,
    created_at,
    updated_at
FROM video_reviews
WHERE video_id = $1
ORDER BY created_at DESC;

-- name: DeleteVideoReview :exec
DELETE FROM video_reviews
WHERE id = $1;

-- name: UpdateVideoReview :one
UPDATE video_reviews
SET content = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetAssetStatusByVideoID :one
SELECT a.status
FROM assets a
INNER JOIN videos v ON v.asset_id = a.id
WHERE v.id = $1;
