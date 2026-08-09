-- Renumbered from 20260613100000: the original stamp sorted BELOW migrations
-- already applied in dev/prod, and golang-migrate only moves forward — the
-- migration would have been skipped silently on deploy.
-- IF NOT EXISTS keeps the re-run a no-op on local DBs that applied the old stamp.
CREATE TABLE IF NOT EXISTS user_devices (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         text        NOT NULL,
    expo_push_token text        NOT NULL UNIQUE,
    platform        text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_seen_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices (user_id);
