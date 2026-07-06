"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatabaseSchema = ensureDatabaseSchema;
const _1 = require(".");
async function ensureDatabaseSchema() {
    await _1.pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await _1.pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await _1.pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_id BIGINT UNIQUE NOT NULL,
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
    await _1.pool.query(`
    CREATE TABLE IF NOT EXISTS ordas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      khan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await _1.pool.query(`
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
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
    await _1.pool.query(`
    UPDATE users
    SET display_name = first_name
    WHERE display_name IS NULL AND first_name IS NOT NULL
  `);
    await _1.pool.query(`
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
    await _1.pool.query('DROP TRIGGER IF EXISTS users_timestamps_trigger ON users');
    await _1.pool.query(`
    CREATE TRIGGER users_timestamps_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_users_timestamps_and_display_name()
  `);
    await _1.pool.query(`
    CREATE TABLE IF NOT EXISTS territories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      polygon GEOMETRY(Polygon, 4326) NOT NULL,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await _1.pool.query(`
    CREATE OR REPLACE FUNCTION recalculate_influence_points()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        UPDATE users
        SET influence_points = (
          SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
          FROM territories
          WHERE owner_id = OLD.owner_id
        )
        WHERE id = OLD.owner_id;
        RETURN OLD;
      ELSE
        UPDATE users
        SET influence_points = (
          SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
          FROM territories
          WHERE owner_id = NEW.owner_id
        )
        WHERE id = NEW.owner_id;
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);
    await _1.pool.query('DROP TRIGGER IF EXISTS territories_influence_trigger ON territories');
    await _1.pool.query(`
    CREATE TRIGGER territories_influence_trigger
    AFTER INSERT OR UPDATE OR DELETE ON territories
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_influence_points()
  `);
    await _1.pool.query(`
    UPDATE users u
    SET influence_points = (
      SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
      FROM territories t
      WHERE t.owner_id = u.id
    )
  `);
    await _1.pool.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      strava_activity_id BIGINT UNIQUE NOT NULL,
      coordinates JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
