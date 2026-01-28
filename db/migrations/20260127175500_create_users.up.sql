CREATE TABLE users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    language TEXT NOT NULL,
    avatar BYTEA,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE groups 
    ADD CONSTRAINT fk_groups_owner 
    FOREIGN KEY (owner_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

ALTER TABLE assets 
    ADD CONSTRAINT fk_assets_owner 
    FOREIGN KEY (owner_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

ALTER TABLE user_groups 
    ADD CONSTRAINT fk_user_groups_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;
