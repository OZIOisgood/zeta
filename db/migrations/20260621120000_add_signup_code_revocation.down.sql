UPDATE signup_codes SET status = 'available' WHERE status = 'revoked';

ALTER TABLE signup_codes
    DROP COLUMN IF EXISTS revoked_by_user_id,
    DROP COLUMN IF EXISTS revoked_at;

ALTER TYPE signup_code_status RENAME TO signup_code_status_old;
CREATE TYPE signup_code_status AS ENUM ('available', 'consumed');
ALTER TABLE signup_codes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE signup_codes
    ALTER COLUMN status TYPE signup_code_status USING status::text::signup_code_status;
ALTER TABLE signup_codes ALTER COLUMN status SET DEFAULT 'available';
DROP TYPE signup_code_status_old;
