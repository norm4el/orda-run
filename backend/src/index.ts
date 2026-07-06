import * as dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import path from 'path';
import { webhookCallback } from 'grammy';
import { apiRouter } from './api';
import { stravaRouter } from './api/strava';
import { bot } from './bot';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const webhookPath = process.env.BOT_WEBHOOK_PATH ?? '/telegram/webhook';

app.use(cors());
app.use(express.json());

// Теперь __dirname это /app/backend/dist, а public лежит в /app/backend/dist/public
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);
app.use('/strava', stravaRouter);
app.use(webhookPath, webhookCallback(bot, 'express'));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  if (process.env.BOT_WEBHOOK_URL) {
    await bot.api.setWebhook(new URL(webhookPath, process.env.BOT_WEBHOOK_URL).toString());
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

void start();