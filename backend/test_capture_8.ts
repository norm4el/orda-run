import { pool } from './src/db';
import polyline from '@mapbox/polyline';
import { captureTerritory } from './src/db/territory';

async function test() {
  // A figure 8: A -> B -> C -> D -> A (with intersection)
  const points: [number, number][] = [
    [51.10, 71.40],
    [51.10, 71.42],
    [51.12, 71.40],
    [51.12, 71.42],
    [51.10, 71.40]
  ];
  const encoded = polyline.encode(points);
  const res = await pool.query('SELECT id FROM users LIMIT 1');
  if (res.rowCount === 0) { console.log('No user'); process.exit(1); }
  
  try {
    const result = await captureTerritory(res.rows[0].id, encoded);
    console.log('Capture result:', result);
  } catch (e) {
    console.error('Failed', e);
  }
  process.exit(0);
}

test();
