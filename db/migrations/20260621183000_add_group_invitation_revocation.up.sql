ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'revoked';

ALTER TABLE group_invitations
    ADD COLUMN status_changed_at TIMESTAMP WITH TIME ZONE;
