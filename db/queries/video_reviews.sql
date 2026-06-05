-- name: CreateVideoReview :one
INSERT INTO video_reviews (
    video_id,
    content,
    timestamp_seconds,
    parent_id,
    author_id
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: ListVideoReviews :many
SELECT
    r.id,
    r.video_id,
    r.content,
    r.timestamp_seconds,
    r.parent_id,
    r.author_id,
    r.created_at,
    r.updated_at,
    up.first_name  AS author_first_name,
    up.last_name   AS author_last_name,
    up.avatar      AS author_avatar
FROM video_reviews r
LEFT JOIN user_preferences up ON up.user_id = r.author_id
WHERE r.video_id = $1
ORDER BY COALESCE(r.parent_id, r.id), r.parent_id NULLS FIRST, r.created_at;

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
SELECT a.id AS asset_id, a.owner_id, a.name, a.group_id, COALESCE(g.name, '') AS group_name
FROM assets a
INNER JOIN videos v ON v.asset_id = a.id
LEFT JOIN groups g ON g.id = a.group_id
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

-- name: GetVideoReview :one
SELECT id, video_id, parent_id, author_id
FROM video_reviews
WHERE id = $1;
