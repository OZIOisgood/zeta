-- name: CreateGroup :one
INSERT INTO groups (name, owner_id, avatar, description) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: AddUserToGroup :exec
INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2);

-- name: ListUserGroups :many
SELECT g.id, g.name, g.owner_id, g.avatar, g.description, g.created_at, g.updated_at
FROM groups g
JOIN user_groups ug ON g.id = ug.group_id
WHERE ug.user_id = $1
ORDER BY g.created_at DESC;

-- name: UpdateGroup :one
UPDATE groups SET name = $2, description = $3, avatar = $4, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: CheckUserGroup :one
SELECT EXISTS(SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2);

-- name: GetGroup :one
SELECT * FROM groups
WHERE id = $1 LIMIT 1;

-- name: ListGroupMembers :many
SELECT user_id FROM user_groups
WHERE group_id = $1;

-- name: CreateGroupInvitation :one
INSERT INTO group_invitations (group_id, inviter_id, email, code)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: GetGroupInvitationByCode :one
SELECT * FROM group_invitations
WHERE code = $1 LIMIT 1;

-- name: RemoveUserFromGroup :exec
DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2;

-- name: UpdateGroupInvitationStatus :exec
UPDATE group_invitations SET status = @status WHERE id = @id;
