-- name: CreateUser :one
INSERT INTO users (
    id,
    first_name,
    last_name,
    email,
    language,
    avatar
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: UpdateUser :one
UPDATE users
SET
    first_name = COALESCE(NULLIF(@first_name::text, ''), first_name),
    last_name = COALESCE(NULLIF(@last_name::text, ''), last_name),
    language = COALESCE(NULLIF(@language::text, ''), language),
    avatar = COALESCE(@avatar::bytea, avatar),
    updated_at = CURRENT_TIMESTAMP
WHERE id = @id
RETURNING *;
