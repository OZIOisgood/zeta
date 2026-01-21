-- name: GetCounter :one
SELECT value FROM counters WHERE id = 1;

-- name: IncrementCounter :one
UPDATE counters 
SET value = value + 1, updated_at = NOW() 
WHERE id = 1 
RETURNING value;
