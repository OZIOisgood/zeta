CREATE TYPE language_code AS ENUM ('en', 'de', 'fr');

CREATE TABLE user_preferences (
    user_id TEXT PRIMARY KEY,
    language language_code NOT NULL DEFAULT 'en',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
