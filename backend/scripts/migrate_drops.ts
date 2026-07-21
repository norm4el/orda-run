import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration to create loot_drops...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS loot_drops (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          location GEOMETRY(Point, 4326),
          type TEXT NOT NULL,
          value INT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      -- Create an index on location for faster distance queries
      CREATE INDEX IF NOT EXISTS loot_drops_location_idx ON loot_drops USING GIST (location);
      
      -- Create a trigger to auto-update location from lat/lng on insert if location is null
      CREATE OR REPLACE FUNCTION set_loot_drop_location()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.location IS NULL THEN
              NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS loot_drops_location_trigger ON loot_drops;
      CREATE TRIGGER loot_drops_location_trigger
      BEFORE INSERT OR UPDATE ON loot_drops
      FOR EACH ROW
      EXECUTE FUNCTION set_loot_drop_location();
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
