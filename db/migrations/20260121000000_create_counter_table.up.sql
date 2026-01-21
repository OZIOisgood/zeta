CREATE TABLE counters (
    id SERIAL PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the single counter row
INSERT INTO counters (id, value) VALUES (1, 0);
