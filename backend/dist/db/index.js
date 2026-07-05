"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
// 1. Обязательно вызываем config() в самом начале
console.log("DEBUG: Загруженный хост:", process.env.PGHOST);
dotenv_1.default.config();
// 2. Явно используем переменные, которые ты прописал в .env
exports.pool = new pg_1.Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '1234', // Здесь укажи свой пароль из .env
    database: process.env.PGDATABASE || 'ordarun',
});
async function query(text, values) {
    return exports.pool.query(text, values);
}
