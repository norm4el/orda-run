import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { webhookCallback } from 'grammy';
import { apiRouter } from './api';
import { stravaRouter } from './api/strava';
import { ensureDatabaseSchema } from './db/schema';
import { bot } from './bot';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const webhookPath = process.env.BOT_WEBHOOK_PATH ?? '/telegram/webhook';
const spaDirectoryCandidates = [
  path.resolve(__dirname, 'public'),
  path.resolve(process.cwd(), 'dist', 'public'),
  path.resolve(process.cwd(), '..', 'frontend', 'dist'),
];
const spaDirectory = spaDirectoryCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));

app.use(cors());
app.use(express.json());

if (spaDirectory) {
  app.use(express.static(spaDirectory));
}

app.use('/api', apiRouter);
app.use('/api/strava', stravaRouter);
app.use(webhookPath, webhookCallback(bot, 'express'));

app.get('*', (_req, res) => {
  if (!spaDirectory) {
    res.status(404).send('Frontend build not found');
    return;
  }

  res.sendFile(path.join(spaDirectory, 'index.html'));
});

async function start() {
  await ensureDatabaseSchema();

  if (process.env.BOT_WEBHOOK_URL) {
    await bot.api.setWebhook(new URL(webhookPath, process.env.BOT_WEBHOOK_URL).toString());
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

void start();