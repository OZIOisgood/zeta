-- name: CreateVideoReview :one
INSERT INTO video_reviews (
    video_id,
    content,
    timestamp_seconds
) VALUES (
    $1, $2, $3
) RETURNING *;

-- name: ListVideoReviews :many
SELECT 
    id,
    video_id,
    content,
    timestamp_seconds,
    created_at,
    updated_at
FROM video_reviews
WHERE video_id = $1
ORDER BY created_at DESC;

-- name: DeleteVideoReview :exec
DELETE FROM video_reviews
WHERE id = $1 AND video_id = $2;

-- name: UpdateVideoReview :one
UPDATE video_reviews
SET content = $2, updated_at = NOW()
WHERE id = $1 AND video_id = $3
RETURNING *;

-- name: GetAssetStatusByVideoID :one
SELECT a.status
FROM assets a
INNER JOIN videos v ON v.asset_id = a.id
WHERE v.id = $1;

-- name: GetAssetOwnerByVideoID :one
SELECT a.owner_id, a.name
FROM assets a
INNER JOIN videos v ON v.asset_id = a.id
WHERE v.id = $1;

-- name: CheckVideoVisibleToUser :one
SELECT EXISTS (
    SELECT 1
    FROM videos v
    INNER JOIN assets a ON a.id = v.asset_id
    WHERE v.id = sqlc.arg(video_id)
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
) as visible;

-- name: CountVideosWithoutReviews :one
SELECT COUNT(*) as count
FROM videos v
LEFT JOIN video_reviews r ON v.id = r.video_id
WHERE v.asset_id = $1
GROUP BY v.asset_id
HAVING COUNT(r.id) = 0
   OR COUNT(DISTINCT v.id) > COUNT(DISTINCT r.video_id);

-- name: HasVideosWithoutReviews :one
SELECT EXISTS (
    SELECT 1
    FROM videos v
    LEFT JOIN video_reviews r ON v.id = r.video_id
    WHERE v.asset_id = $1
    GROUP BY v.id
    HAVING COUNT(r.id) = 0
) as has_unreviewed;
