-- Append-only audit trail. RANGE-partitioned by month on occurred_at so that
-- retention is a partition DROP (DDL) rather than row DELETE (DML). The PK must
-- include the partition key. Actor and resource ids are TEXT because user ids
-- are WorkOS string ids; resource ids hold either uuid-as-text or WorkOS ids.
CREATE TABLE IF NOT EXISTS audit_events (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    occurred_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actor_id      TEXT,
    actor_type    TEXT NOT NULL,
    actor_label   TEXT,
    action        TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id   TEXT,
    group_id      TEXT,
    old_values    JSONB,
    new_values    JSONB,
    metadata      JSONB,
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource
    ON audit_events (resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON audit_events (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_group
    ON audit_events (group_id, occurred_at DESC);

-- Immutability: rows may only be inserted, never changed or deleted. Retention
-- uses DROP/DETACH PARTITION (DDL), which does NOT fire this row-level trigger.
CREATE OR REPLACE FUNCTION audit_events_block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_block_mutation
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_block_mutation();

-- Row-level triggers do not fire on TRUNCATE; add a statement-level guard so the
-- table (and its partitions) cannot be truncated either.
CREATE TRIGGER audit_events_block_truncate
    BEFORE TRUNCATE ON audit_events
    FOR EACH STATEMENT EXECUTE FUNCTION audit_events_block_mutation();
