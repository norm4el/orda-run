import * as dotenv from 'dotenv';
dotenv.config(); // Должно быть в самой первой строке!

import express from 'express';
import path from 'path';

import { webhookCallback } from 'grammy';
import { apiRouter } from './api';
import { stravaRouter } from './api/strava';
import { bot } from './bot';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);
const webhookPath = process.env.BOT_WEBHOOK_PATH ?? '/telegram/webhook';

app.use(express.json());
app.get('/ping', (_req, res) => {
  res.json({ ok: true });
});
app.use(express.static(path.resolve(__dirname, '../../frontend')));
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
