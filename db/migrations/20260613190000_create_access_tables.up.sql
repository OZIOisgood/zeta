CREATE TYPE access_status AS ENUM ('waitlisted', 'active');
CREATE TYPE signup_code_status AS ENUM ('available', 'consumed');

CREATE TABLE IF NOT EXISTS user_access (
    user_id       TEXT PRIMARY KEY,
    status        access_status NOT NULL DEFAULT 'waitlisted',
    activated_at  TIMESTAMP WITH TIME ZONE,
    activated_via TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signup_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                TEXT NOT NULL UNIQUE,
    owner_user_id       TEXT NOT NULL,
    status              signup_code_status NOT NULL DEFAULT 'available',
    redeemed_by_user_id TEXT,
    consumed_at         TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_codes_owner ON signup_codes (owner_user_id);
