CREATE TYPE video_status AS ENUM ('waiting_upload', 'ready', 'failed');
CREATE TYPE asset_status AS ENUM ('waiting_upload', 'pending', 'completed');

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status asset_status NOT NULL DEFAULT 'waiting_upload',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    mux_upload_id TEXT NOT NULL,
    mux_asset_id TEXT,
    playback_id TEXT,
    status video_status NOT NULL DEFAULT 'waiting_upload',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
