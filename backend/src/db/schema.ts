import { pool } from '.';

export async function ensureDatabaseSchema() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_id BIGINT UNIQUE,
      username TEXT,
      first_name TEXT,
      display_name TEXT,
      strava_access_token TEXT,
      strava_refresh_token TEXT,
      strava_expires_at INTEGER,
      strava_athlete_id BIGINT UNIQUE,
      influence_points INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ordas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      khan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username TEXT,
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS strava_access_token TEXT,
      ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS strava_expires_at INTEGER,
      ADD COLUMN IF NOT EXISTS strava_athlete_id BIGINT UNIQUE,
      ADD COLUMN IF NOT EXISTS orda_id UUID REFERENCES ordas(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS color_self TEXT NOT NULL DEFAULT '#d8a760',
      ADD COLUMN IF NOT EXISTS color_others TEXT NOT NULL DEFAULT '#2c5a5a',
      ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_auth_sessions (
      session_id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    UPDATE users
    SET display_name = first_name
    WHERE display_name IS NULL AND first_name IS NOT NULL
  `);

  await pool.query(`
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
  `);

  await pool.query('DROP TRIGGER IF EXISTS users_timestamps_trigger ON users');
  await pool.query(`
    CREATE TRIGGER users_timestamps_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_users_timestamps_and_display_name()
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS territories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      polygon GEOMETRY(Polygon, 4326) NOT NULL,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bonus_points INT NOT NULL DEFAULT 0;

    ALTER TABLE territories
      ADD COLUMN IF NOT EXISTS health INT NOT NULL DEFAULT 100;
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION recalculate_influence_points()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        UPDATE users
        SET influence_points = (
          SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
          FROM territories
          WHERE owner_id = OLD.owner_id
        ) + COALESCE((SELECT bonus_points FROM users WHERE id = OLD.owner_id), 0)
        WHERE id = OLD.owner_id;
        RETURN OLD;
      ELSE
        UPDATE users
        SET influence_points = (
          SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
          FROM territories
          WHERE owner_id = NEW.owner_id
        ) + COALESCE((SELECT bonus_points FROM users WHERE id = NEW.owner_id), 0)
        WHERE id = NEW.owner_id;
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query('DROP TRIGGER IF EXISTS territories_influence_trigger ON territories');
  await pool.query(`
    CREATE TRIGGER territories_influence_trigger
    AFTER INSERT OR UPDATE OR DELETE ON territories
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_influence_points()
  `);

  await pool.query(`
    UPDATE users u
    SET influence_points = (
      SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
      FROM territories t
      WHERE t.owner_id = u.id
    ) + u.bonus_points
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      strava_activity_id BIGINT UNIQUE NOT NULL,
      coordinates JSONB NOT NULL,
      distance FLOAT DEFAULT 0,
      duration INT DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE routes
      ADD COLUMN IF NOT EXISTS distance FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS duration INT DEFAULT 0
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL, -- 'CAPTURE', 'STEAL', 'ORDA_JOIN', 'ORDA_CREATE'
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS claimed_quests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id TEXT NOT NULL,
      claimed_at DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE (user_id, quest_id, claimed_at)
    )
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS social_links JSONB;

    ALTER TABLE ordas
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orda_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      orda_id UUID NOT NULL REFERENCES ordas(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}