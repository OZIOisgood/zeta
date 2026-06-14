-- name: CreateAuditEvent :exec
INSERT INTO audit_events (
    actor_id, actor_type, actor_label, action,
    resource_type, resource_id, group_id,
    old_values, new_values, metadata
) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7,
    $8, $9, $10
);
