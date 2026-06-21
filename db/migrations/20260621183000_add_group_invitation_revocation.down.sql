UPDATE group_invitations SET status = 'pending' WHERE status = 'revoked';

ALTER TABLE group_invitations DROP COLUMN IF EXISTS status_changed_at;

ALTER TYPE invitation_status RENAME TO invitation_status_old;
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
ALTER TABLE group_invitations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE group_invitations
    ALTER COLUMN status TYPE invitation_status USING status::text::invitation_status;
ALTER TABLE group_invitations ALTER COLUMN status SET DEFAULT 'pending';
DROP TYPE invitation_status_old;
