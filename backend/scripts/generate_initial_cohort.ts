import { Pool } from 'pg';
import crypto from 'crypto';
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

import { captureTerritory } from '../src/db/territory';

async function generate() {
  console.log('Generating initial test cohort...');
  const client = await pool.connect();
  
  try {
    // 1. Create Orda "не норм челы"
    const ordaId = crypto.randomUUID();
    await client.query(
      `INSERT INTO ordas (id, name, color, owner_id) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
      [ordaId, 'не норм челы', '#22c55e', null]
    );
    
    // Get the orda ID in case it already existed
    const ordaRes = await client.query(`SELECT id FROM ordas WHERE name = 'не норм челы'`);
    const finalOrdaId = ordaRes.rows[0].id;

    // 2. Create cohort users
    const numUsers = INITIAL_COHORT_NAMES.length;
    for (let i = 0; i < numUsers; i++) {
      const userId = crypto.randomUUID();
      const tgId = Math.floor(Math.random() * 1000000000).toString();
      const nickname = INITIAL_COHORT_NAMES[i];
      const influencePoints = Math.floor(Math.random() * 50000) + 1000;
      
      await client.query(
        `INSERT INTO users (id, telegram_id, username, display_name, orda_id, influence_points) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, tgId, nickname, nickname, finalOrdaId, influencePoints]
      );
      
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
          await captureTerritory(userId, polyStr);
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
