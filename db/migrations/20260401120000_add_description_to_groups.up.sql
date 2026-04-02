ALTER TABLE groups ADD COLUMN description TEXT NOT NULL DEFAULT '';
UPDATE groups SET description = '' WHERE description IS NULL;
