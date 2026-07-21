import { pool } from './src/db';
import polyline from '@mapbox/polyline';
import { captureTerritory } from './src/db/territory';

async function test() {
  const points: [number, number][] = [
    [51.13, 71.43],
    [51.14, 71.43],
    [51.14, 71.44],
    [51.13, 71.44]
  ];
  const encoded = polyline.encode(points);
  console.log('Encoded:', encoded);
  
  const res = await pool.query('SELECT id FROM users LIMIT 1');
  if (res.rowCount === 0) {
      console.log('No user'); process.exit(1);
  }
  const userId = res.rows[0].id;
  
  const result = await captureTerritory(userId, encoded);
  console.log('Capture result:', result);
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
