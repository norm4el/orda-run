import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import polyline from '@mapbox/polyline';
import { captureTerritory } from '../src/db/territory';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CITIES = [
  { name: 'Almaty', center: [76.9286, 43.2220] },
  { name: 'Karaganda', center: [73.0985, 49.8018] },
  { name: 'Shymkent', center: [69.5983, 42.3417] },
  { name: 'Pavlodar', center: [76.9550, 52.3155] }
];

function createCirclePolyline(center: [number, number], radiusKm: number, points: number = 8) {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    // Add random noise
    const r = radiusKm * (0.7 + Math.random() * 0.6);
    const latOffset = (r / 111) * Math.sin(angle);
    const lngOffset = (r / (111 * Math.cos(center[1] * Math.PI / 180))) * Math.cos(angle);
    coords.push([center[1] + latOffset, center[0] + lngOffset]); // Polyline takes [lat, lng]
  }
  return polyline.encode(coords);
}

const SYSTEM_NPC_UUID = '00000000-0000-0000-0000-000000000001';

async function generate() {
  console.log('Generating NPC neutral zones...');
  const client = await pool.connect();
  
  try {
    // 1. Create NPC user
    await client.query(
      `INSERT INTO users (id, telegram_id, username, display_name, influence_points) 
       VALUES ($1, -1, 'System', 'Система', 999999) ON CONFLICT (telegram_id) DO NOTHING`,
      [SYSTEM_NPC_UUID]
    );

    // 2. Clear old NPC territories just in case (optional, we can leave this out to just add more)
    // await client.query(`DELETE FROM territories WHERE owner_id = $1`, [SYSTEM_NPC_UUID]);

    let generatedCount = 0;

    // 3. Scatter neutral zones
    for (const city of CITIES) {
      console.log(`Scattering zones in ${city.name}...`);
      
      // Create 30 zones per city
      for (let j = 0; j < 30; j++) {
        // Random center within ~10km radius
        const latOffset = (Math.random() - 0.5) * 0.15;
        const lngOffset = (Math.random() - 0.5) * 0.15;
        const zoneCenter: [number, number] = [city.center[0] + lngOffset, city.center[1] + latOffset];
        
        // Radius between 100m and 400m
        const radius = 0.1 + Math.random() * 0.3; 
        
        const encodedPolyline = createCirclePolyline(zoneCenter, radius, 12);
        
        try {
          await captureTerritory(SYSTEM_NPC_UUID, encodedPolyline);
          generatedCount++;
        } catch (e) {
          console.error(`Failed to capture NPC territory in ${city.name}:`, e);
        }
      }
    }
    
    console.log(`Successfully generated ${generatedCount} NPC neutral zones.`);

  } catch (err) {
    console.error('Error generating NPC zones:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

generate();
