import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url'; // Добавлено для корректной работы __dirname

import { webhookCallback } from 'grammy';
import { apiRouter } from './api';
import { stravaRouter } from './api/strava';
import { bot } from './bot';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const webhookPath = process.env.BOT_WEBHOOK_PATH ?? '/telegram/webhook';

app.use(express.json());

app.get('/ping', (_req, res) => {
  res.json({ ok: true });
});

// 1. Раздаем статику из папки 'public' (туда мы положим собранный фронт)
app.use(express.static(path.join(__dirname, '../public')));

// 2. Все остальные GET запросы отправляем на index.html (для работы роутинга Vite)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use('/api', apiRouter);
app.use('/strava', stravaRouter);
app.use(webhookPath, webhookCallback(bot, 'express'));

async function start() {
  if (process.env.BOT_WEBHOOK_URL) {
    await bot.api.setWebhook(new URL(webhookPath, process.env.BOT_WEBHOOK_URL).toString());
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

void start();