UPDATE group_invitations
SET email = ''
WHERE email IS NULL;

ALTER TABLE group_invitations
    ALTER COLUMN email SET NOT NULL;
