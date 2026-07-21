import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CENTER_LAT = 43.2220;
const CENTER_LNG = 76.9286;

function getRandomOffset(radiusDegrees = 0.05) {
  return (Math.random() - 0.5) * 2 * radiusDegrees;
}

async function generateDrops() {
  const client = await pool.connect();
  try {
    console.log('Generating loot drops...');
    
    // Clear old drops
    await client.query(`DELETE FROM loot_drops;`);

    let count = 0;
    for (let i = 0; i < 50; i++) {
      const lat = CENTER_LAT + getRandomOffset(0.08);
      const lng = CENTER_LNG + getRandomOffset(0.08);
      const type = Math.random() > 0.3 ? 'XP_BOOST' : 'ENERGY';
      const value = type === 'XP_BOOST' ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 5) + 1;
      
      await client.query(
        `INSERT INTO loot_drops (lat, lng, type, value) VALUES ($1, $2, $3, $4)`,
        [lat, lng, type, value]
      );
      count++;
    }
    
    console.log(`Generated ${count} loot drops.`);
  } catch (err) {
    console.error('Failed to generate drops:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

generateDrops();
