-- name: EnsureUserAccess :one
INSERT INTO user_access (user_id)
VALUES ($1)
ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
RETURNING *;

-- name: GetUserAccess :one
SELECT * FROM user_access WHERE user_id = $1;

-- name: ActivateUserAccess :one
UPDATE user_access
SET status = 'active', activated_at = NOW(), activated_via = @activated_via
WHERE user_id = @user_id
RETURNING *;

-- name: CreateSignupCode :one
INSERT INTO signup_codes (code, owner_user_id)
VALUES ($1, $2)
RETURNING *;

-- name: ListSignupCodesByOwner :many
SELECT * FROM signup_codes WHERE owner_user_id = $1 ORDER BY created_at ASC;

-- name: CountSignupCodesByOwner :one
SELECT COUNT(*) FROM signup_codes WHERE owner_user_id = $1;

-- name: ConsumeSignupCode :one
UPDATE signup_codes
SET status = 'consumed', redeemed_by_user_id = @redeemed_by_user_id, consumed_at = NOW()
WHERE code = @code AND status = 'available'
RETURNING *;

-- name: ReleaseSignupCode :exec
UPDATE signup_codes
SET status = 'available', redeemed_by_user_id = NULL, consumed_at = NULL
WHERE id = @id;
