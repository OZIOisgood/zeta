-- Reset all stored timezone values to UTC.
-- Existing values are not migrated (pre-release; data is ephemeral).
-- Users will re-select their timezone from the new Settings page.
UPDATE user_preferences SET timezone = 'UTC';
