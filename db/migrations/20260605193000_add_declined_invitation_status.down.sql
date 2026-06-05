-- Postgres cannot drop an enum value, so recreate the type without 'declined'.
-- Any rows still marked declined are reset to pending before the cast.
UPDATE group_invitations SET status = 'pending' WHERE status = 'declined';

ALTER TYPE invitation_status RENAME TO invitation_status_old;
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted');
ALTER TABLE group_invitations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE group_invitations
    ALTER COLUMN status TYPE invitation_status USING status::text::invitation_status;
ALTER TABLE group_invitations ALTER COLUMN status SET DEFAULT 'pending';
DROP TYPE invitation_status_old;
