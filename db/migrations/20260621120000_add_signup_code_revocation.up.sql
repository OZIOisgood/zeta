ALTER TYPE signup_code_status ADD VALUE IF NOT EXISTS 'revoked';

ALTER TABLE signup_codes
    ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN revoked_by_user_id TEXT;
