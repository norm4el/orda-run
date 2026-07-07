import { pool } from '../src/db';

async function run() {
  try {
    console.log('Truncating territories table...');
    await pool.query('TRUNCATE TABLE territories CASCADE');
    console.log('Successfully wiped all territories!');
  } catch (error) {
    console.error('Error wiping territories:', error);
  } finally {
    process.exit(0);
  }
}

run();
