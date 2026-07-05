"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stravaRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
exports.stravaRouter = (0, express_1.Router)();
exports.stravaRouter.get('/auth', (req, res) => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = process.env.STRAVA_REDIRECT_URI;
    if (!clientId || !redirectUri) {
        res.status(500).send('STRAVA_CLIENT_ID или STRAVA_REDIRECT_URI не заданы');
        return;
    }
    const telegramId = req.query.telegram_id;
    if (!telegramId || typeof telegramId !== 'string') {
        res.status(400).send('telegram_id is required');
        return;
    }
    const authUrl = new URL(STRAVA_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('approval_prompt', 'auto');
    authUrl.searchParams.set('scope', process.env.STRAVA_SCOPE ?? 'read,activity:read_all');
    authUrl.searchParams.set('state', telegramId);
    res.redirect(authUrl.toString());
});
exports.stravaRouter.get('/callback', async (req, res) => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const code = req.query.code;
    const state = req.query.state;
    if (!clientId || !clientSecret) {
        res.status(500).send('STRAVA_CLIENT_ID или STRAVA_CLIENT_SECRET не заданы');
        return;
    }
    if (typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).send('code and state are required');
        return;
    }
    const response = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        res.status(502).send(errorText);
        return;
    }
    const tokenData = (await response.json());
    await (0, db_1.query)(`
      INSERT INTO users (telegram_id, strava_access_token, strava_refresh_token)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id) DO UPDATE
      SET strava_access_token = EXCLUDED.strava_access_token,
          strava_refresh_token = EXCLUDED.strava_refresh_token
    `, [state, tokenData.access_token, tokenData.refresh_token]);
    res
        .status(200)
        .type('html')
        .send('<!doctype html><html><body>Успешно, закрой окно</body></html>');
});
exports.stravaRouter.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    if (typeof mode !== 'string' || mode !== 'subscribe') {
        res.sendStatus(400);
        return;
    }
    if (!expectedToken || typeof token !== 'string' || token !== expectedToken) {
        res.sendStatus(403);
        return;
    }
    if (typeof challenge !== 'string') {
        res.sendStatus(400);
        return;
    }
    res.status(200).send(challenge);
});
exports.stravaRouter.post('/webhook', (req, res) => {
    console.log(req.body);
    res.sendStatus(200);
});
