-- Allow invitations to be explicitly declined by the recipient (in-app action).
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'declined';
