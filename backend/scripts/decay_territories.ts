import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432'),
});

async function runDecay() {
  const client = await pool.connect();
  console.log('Starting territory decay job...');
  try {
    await client.query('BEGIN');

    // 1. Find all territories that haven't been captured/defended in >3 days
    // and reduce health by 25
    const decayRes = await client.query(`
      UPDATE territories
      SET health = health - 25
      WHERE captured_at < NOW() - INTERVAL '3 days'
        AND owner_id != '00000000-0000-0000-0000-000000000001'
      RETURNING id, health, owner_id;
    `);

    console.log(`Decayed health for ${decayRes.rowCount} territories.`);

    // 2. Find territories that hit 0 health
    const deadTerritories = decayRes.rows.filter(r => r.health <= 0);
    
    if (deadTerritories.length > 0) {
      const ids = deadTerritories.map(t => t.id);
      
      // Make them neutral (NPC) and restore health to 100
      await client.query(`
        UPDATE territories
        SET owner_id = '00000000-0000-0000-0000-000000000001',
            health = 100,
            captured_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [ids]);

      console.log(`${deadTerritories.length} territories became neutral due to decay.`);

      // Log events for the users
      const userIds = [...new Set(deadTerritories.map(t => t.owner_id))];
      for (const uid of userIds) {
        await client.query(`
          INSERT INTO game_events (user_id, event_type, message)
          VALUES ($1, 'DECAY', 'потерял часть территорий из-за бездействия')
        `, [uid]);
      }
    }

    await client.query('COMMIT');
    console.log('Decay job completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error running decay job:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runDecay();
