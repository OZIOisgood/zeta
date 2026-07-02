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

-- name: CreateSignupCodeWithinLimit :one
INSERT INTO signup_codes (code, owner_user_id)
SELECT @code, @owner_id
FROM (SELECT pg_advisory_xact_lock(hashtextextended(@owner_id, 0))) AS owner_lock
WHERE (
    SELECT COUNT(*)
    FROM signup_codes AS existing
    WHERE existing.owner_user_id = @owner_id
) < @code_limit::bigint
RETURNING id, code, owner_user_id, status, redeemed_by_user_id, consumed_at, created_at;

-- name: ListSignupCodesByOwner :many
SELECT id, code, owner_user_id, status, redeemed_by_user_id, consumed_at, created_at
FROM signup_codes WHERE owner_user_id = $1 ORDER BY created_at ASC;

-- name: CountSignupCodesByOwner :one
SELECT COUNT(*) FROM signup_codes
WHERE owner_user_id = $1;

-- name: ConsumeSignupCode :one
UPDATE signup_codes
SET status = 'consumed', redeemed_by_user_id = @redeemed_by_user_id, consumed_at = NOW()
WHERE code = @code AND status = 'available'
RETURNING id, code, owner_user_id, status, redeemed_by_user_id, consumed_at, created_at;

-- name: ReleaseSignupCode :exec
UPDATE signup_codes
SET status = 'available', redeemed_by_user_id = NULL, consumed_at = NULL
WHERE id = @id;
