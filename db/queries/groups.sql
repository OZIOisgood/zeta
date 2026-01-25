-- name: CreateGroup :one
INSERT INTO groups (name) VALUES ($1) RETURNING *;

-- name: AddUserToGroup :exec
INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2);

-- name: ListUserGroups :many
SELECT g.id, g.name, g.created_at, g.updated_at
FROM groups g
JOIN user_groups ug ON g.id = ug.group_id
WHERE ug.user_id = $1
ORDER BY g.created_at DESC;
