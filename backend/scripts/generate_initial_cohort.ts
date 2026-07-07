import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import polyline from '@mapbox/polyline';

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

const INITIAL_COHORT_NAMES = [
  'Alikhannnxz 🇩🇪', '.', 'М', '💀', 'Darkst4r 🦇',
  'Aruzhan_', '. Kizaru', 'D', 'Дамир', 'snxee 🌧',
  'Toxic<3', 'zxcv', 'arslan bekov', 'Angel 👼', '🤡',
  'd3mon#LZT', 'саня терминатор', 'Baha', '✧ kitty ✧ 🎀', 'dianaaaa',
  'хочу спать вечно 🌙', 'xxtrn', 'Белый Казах 👱🏻♂️🤍', 'Nurasyl', 'R1zZa 👾'
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

import { captureTerritory } from '../src/db/territory';

async function generate() {
  console.log('Generating initial test cohort...');
  const client = await pool.connect();
  
  try {
    // 1. Create a Khan user for the Orda
    const khanId = generateUUID();
    const khanTgId = Math.floor(Math.random() * 1000000000).toString();
    const khanName = 'Khan of Chels';
    await client.query(
      `INSERT INTO users (id, telegram_id, username, display_name, influence_points) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (telegram_id) DO NOTHING`,
      [khanId, khanTgId, khanName, khanName, 50000]
    );

    // 2. Create or find Orda "не норм челы"
    let finalOrdaId;
    const ordaRes = await client.query(`SELECT id FROM ordas WHERE name = 'не норм челы' LIMIT 1`);
    if (ordaRes.rows.length > 0) {
      finalOrdaId = ordaRes.rows[0].id;
    } else {
      const ordaId = generateUUID();
      await client.query(
        `INSERT INTO ordas (id, name, khan_id) VALUES ($1, $2, $3)`,
        [ordaId, 'не норм челы', khanId]
      );
      finalOrdaId = ordaId;
    }

    // 3. Create cohort users
    const numUsers = INITIAL_COHORT_NAMES.length;
    for (let i = 0; i < numUsers; i++) {
      const userId = generateUUID();
      const tgId = (9990000000 + i).toString(); // Deterministic ID to avoid duplicates on reruns
      const nickname = INITIAL_COHORT_NAMES[i];
      const influencePoints = Math.floor(Math.random() * 50000) + 1000;
      
      await client.query(
        `INSERT INTO users (id, telegram_id, username, display_name, orda_id, influence_points) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (telegram_id) DO NOTHING`,
        [userId, tgId, nickname, nickname, finalOrdaId, influencePoints]
      );
      
      // We need to fetch the actual user ID in case it already existed from a previous run
      const userRes = await client.query(`SELECT id FROM users WHERE telegram_id = $1`, [tgId]);
      const actualUserId = userRes.rows[0].id;
      
      // Pick a city for this user
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      
      // User's base center in the city
      const userBaseCenter: [number, number] = [
        city.center[0] + (Math.random() - 0.5) * 0.1, // ~5-10km offset
        city.center[1] + (Math.random() - 0.5) * 0.1
      ];

      // Generate 5-15 territories
      const numTerritories = Math.floor(Math.random() * 11) + 5;
      console.log(`Generating activity for ${nickname} in ${city.name} with ${numTerritories} captures...`);
      
      let currentCenter = [...userBaseCenter] as [number, number];
      for (let j = 0; j < numTerritories; j++) {
        // Move center slightly for next territory to create contiguous blobs
        currentCenter[0] += (Math.random() - 0.5) * 0.01;
        currentCenter[1] += (Math.random() - 0.5) * 0.01;
        
        const radius = 0.2 + Math.random() * 0.4; // 200m to 600m
        const polyStr = createCirclePolyline(currentCenter, radius, Math.floor(Math.random() * 5) + 6);
        
        try {
          await captureTerritory(actualUserId, polyStr);
        } catch (e) {
          console.error(`Failed to record capture for ${nickname}:`, e);
        }
      }
    }
    
    console.log('Cohort generation completed successfully!');
  } catch (error) {
    console.error('Error during generation:', error);
  } finally {
    client.release();
    pool.end();
  }
}

generate();
