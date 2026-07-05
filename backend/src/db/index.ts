import dotenv from 'dotenv';
import { Pool } from 'pg';

// 1. Обязательно вызываем config() в самом начале
console.log("DEBUG: Загруженный хост:", process.env.PGHOST);
dotenv.config();

// 2. Явно используем переменные, которые ты прописал в .env
export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '1234', // Здесь укажи свой пароль из .env
  database: process.env.PGDATABASE || 'ordarun',
});

import { QueryResultRow } from 'pg';

export async function query<T extends QueryResultRow = any>(text: string, values?: unknown[]) {
  return pool.query<T>(text, values);
}