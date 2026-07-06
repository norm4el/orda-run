CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    display_name TEXT,
    strava_access_token TEXT,
    strava_refresh_token TEXT,
    strava_expires_at INTEGER,
    influence_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_users_timestamps_and_display_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_name IS NULL AND NEW.first_name IS NOT NULL THEN
        NEW.display_name := NEW.first_name;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_timestamps_trigger ON users;
CREATE TRIGGER users_timestamps_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_users_timestamps_and_display_name();

CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    polygon GEOMETRY(Polygon, 4326) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);