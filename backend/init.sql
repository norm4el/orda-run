CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    strava_access_token TEXT,
    strava_refresh_token TEXT,
    influence_points INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    polygon GEOMETRY(Polygon, 4326) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);