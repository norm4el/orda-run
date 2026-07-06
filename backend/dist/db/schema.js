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
      influence_points INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
}
