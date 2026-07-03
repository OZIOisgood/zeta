CREATE TABLE user_devices (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         text        NOT NULL,
    expo_push_token text        NOT NULL UNIQUE,
    platform        text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_seen_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_devices_user_id ON user_devices (user_id);
