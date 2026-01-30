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
