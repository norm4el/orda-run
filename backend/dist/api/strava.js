"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stravaRouter = void 0;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const polyline_1 = __importDefault(require("@mapbox/polyline"));
const stravaApi = axios_1.default.create();
let rateLimit15m = 100;
let rateUsage15m = 0;
stravaApi.interceptors.response.use((response) => {
    const limitHeader = response.headers['x-ratelimit-limit'];
    const usageHeader = response.headers['x-ratelimit-usage'];
    if (limitHeader)
        rateLimit15m = parseInt(limitHeader.split(',')[0] || '100', 10);
    if (usageHeader)
        rateUsage15m = parseInt(usageHeader.split(',')[0] || '0', 10);
    return response;
}, (error) => {
    if (error.response?.status === 429) {
        console.error('[Strava API] Rate Limit Exceeded (429)!');
    }
    return Promise.reject(error);
});
stravaApi.interceptors.request.use((config) => {
    if (rateLimit15m > 0 && rateUsage15m >= rateLimit15m) {
        console.warn(`[Strava API] Request blocked locally to prevent 429. Usage: ${rateUsage15m}/${rateLimit15m}`);
        return Promise.reject(new Error('Strava Rate Limit Reached locally'));
    }
    return config;
});
const db_1 = require("../db");
const territory_1 = require("../db/territory");
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
    const userId = req.query.user_id;
    const statePayload = userId ? String(userId) : String(telegramId);
    if (!statePayload || statePayload === 'undefined') {
        res.status(400).send('user_id or telegram_id is required');
        return;
    }
    const authUrl = new URL(STRAVA_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('approval_prompt', 'auto');
    authUrl.searchParams.set('scope', process.env.STRAVA_SCOPE ?? 'read,activity:read_all');
    authUrl.searchParams.set('state', statePayload);
    res.redirect(authUrl.toString());
});
exports.stravaRouter.get('/callback', async (req, res) => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const code = req.query.code;
    const state = req.query.state; // We stored telegram_id here
    if (!clientId || !clientSecret) {
        res.status(500).send('STRAVA_CLIENT_ID или STRAVA_CLIENT_SECRET не заданы');
        return;
    }
    if (typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).send('code and state are required');
        return;
    }
    try {
        const response = await stravaApi.post(STRAVA_TOKEN_URL, {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
        });
        const tokenData = response.data;
        const athleteId = tokenData.athlete?.id || null;
        const isUuid = state.includes('-');
        if (isUuid) {
            await (0, db_1.query)(`
          UPDATE users
          SET strava_access_token = $1,
              strava_refresh_token = $2,
              strava_expires_at = $3,
              strava_athlete_id = COALESCE($4, strava_athlete_id),
              updated_at = NOW()
          WHERE id = $5
        `, [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, athleteId, state]);
        }
        else {
            await (0, db_1.query)(`
          UPDATE users
          SET strava_access_token = $1,
              strava_refresh_token = $2,
              strava_expires_at = $3,
              strava_athlete_id = COALESCE($4, strava_athlete_id),
              updated_at = NOW()
          WHERE telegram_id = $5
        `, [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, athleteId, state]);
        }
        // After saving token, we can trigger the fetch activities right away in the background (or await it)
        await fetchAndSaveActivities(state, tokenData.access_token);
        res
            .status(200)
            .type('html')
            .send('<!doctype html><html><body>Успешно, закрой окно</body></html>');
    }
    catch (error) {
        console.error('Strava callback error:', error?.response?.data || error);
        res.status(502).send('Error communicating with Strava');
    }
});
exports.stravaRouter.post('/sync', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const userId = req.body?.user_id;
    const targetId = userId ? String(userId) : String(telegramId);
    if (!targetId || targetId === 'undefined') {
        res.status(400).send('user_id or telegram_id is required');
        return;
    }
    try {
        const accessToken = await ensureValidStravaToken(targetId);
        // Patch: Fetch and save strava_athlete_id if missing
        const isUuid = targetId.includes('-');
        const queryCond = isUuid ? 'id = $1' : 'telegram_id = $1';
        const athleteRes = await (0, db_1.query)(`SELECT strava_athlete_id FROM users WHERE ${queryCond}`, [targetId]);
        if (athleteRes.rows[0] && !athleteRes.rows[0].strava_athlete_id) {
            try {
                const stravaAthleteResponse = await stravaApi.get('https://www.strava.com/api/v3/athlete', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (stravaAthleteResponse.data?.id) {
                    await (0, db_1.query)(`UPDATE users SET strava_athlete_id = $1 WHERE ${queryCond}`, [stravaAthleteResponse.data.id, targetId]);
                    console.log(`Migrated strava_athlete_id for user ${targetId}`);
                }
            }
            catch (err) {
                console.error('Failed to fetch athlete ID for migration:', err);
            }
        }
        await fetchAndSaveActivities(targetId, accessToken);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Strava sync error:', error);
        res.status(500).send('Error syncing with Strava');
    }
});
async function ensureValidStravaToken(targetId) {
    const isUuid = targetId.includes('-');
    const queryCond = isUuid ? 'id = $1' : 'telegram_id = $1';
    const userResult = await (0, db_1.query)(`SELECT strava_access_token, strava_refresh_token, strava_expires_at FROM users WHERE ${queryCond}`, [targetId]);
    if (userResult.rowCount === 0 || !userResult.rows[0]) {
        throw new Error('User not found');
    }
    const { strava_access_token, strava_refresh_token, strava_expires_at } = userResult.rows[0];
    if (!strava_access_token || !strava_refresh_token) {
        throw new Error('Strava not connected');
    }
    // Refresh if token expires in less than 5 minutes
    if (Date.now() / 1000 > strava_expires_at - 300) {
        const clientId = process.env.STRAVA_CLIENT_ID;
        const clientSecret = process.env.STRAVA_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET is missing');
        }
        const response = await stravaApi.post(STRAVA_TOKEN_URL, {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: strava_refresh_token,
        });
        const tokenData = response.data;
        await (0, db_1.query)(`
        UPDATE users
        SET strava_access_token = $1,
            strava_refresh_token = $2,
            strava_expires_at = $3,
            updated_at = NOW()
        WHERE ${queryCond}
      `, [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, targetId]);
        return tokenData.access_token;
    }
    return strava_access_token;
}
async function fetchAndSaveActivities(targetId, accessToken) {
    try {
        const isUuid = targetId.includes('-');
        const queryCond = isUuid ? 'id = $1' : 'telegram_id = $1';
        // Get the user ID from our DB to link routes to them
        const userResult = await (0, db_1.query)(`SELECT id FROM users WHERE ${queryCond}`, [targetId]);
        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            throw new Error(`User not found for id: ${targetId}`);
        }
        const userId = userResult.rows[0].id;
        const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
        const response = await stravaApi.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                after: oneWeekAgo,
            }
        });
        const activities = response.data;
        for (const activity of activities) {
            const allowedTypes = ['Run', 'Walk', 'Hike', 'VirtualRun', 'TrailRun'];
            if (activity.map?.summary_polyline && allowedTypes.includes(activity.type)) {
                // Decode to array of [lat, lng]
                const coordinates = polyline_1.default.decode(activity.map.summary_polyline);
                const insertResult = await (0, db_1.query)(`
            INSERT INTO routes (user_id, strava_activity_id, coordinates)
            VALUES ($1, $2, $3)
            ON CONFLICT (strava_activity_id) DO NOTHING
            RETURNING id
          `, [userId, activity.id, JSON.stringify(coordinates)]);
                if (insertResult.rowCount && insertResult.rowCount > 0) {
                    try {
                        await (0, territory_1.captureTerritory)(userId, activity.map.summary_polyline);
                    }
                    catch (err) {
                        console.error(`Failed to capture territory for activity ${activity.id}:`, err);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error fetching/saving Strava activities:', error?.response?.data || error);
    }
}
exports.stravaRouter.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === expectedToken) {
        console.log('Strava Webhook verified successfully!');
        // Strava expects a JSON response with the challenge
        res.status(200).json({ 'hub.challenge': challenge });
    }
    else {
        console.error('Strava Webhook verification failed!');
        res.sendStatus(403);
    }
});
exports.stravaRouter.post('/webhook', (req, res) => {
    // Бэкенд должен сразу ответить статусом 200 OK (чтобы Strava не повторяла запрос)
    res.sendStatus(200);
    const { object_type, aspect_type, object_id, owner_id } = req.body;
    // Проверяем, что это создание новой тренировки
    if (object_type === 'activity' && aspect_type === 'create') {
        console.log(`[Strava Webhook] New activity created: activity_id=${object_id}, strava_owner_id=${owner_id}`);
        // Асинхронно передаем ID тренировки и юзера в функцию обработки
        processNewActivity(object_id, owner_id).catch(err => {
            console.error('Error processing new webhook activity:', err);
        });
    }
    // Обработка отзыва доступа (deauthorization)
    if (object_type === 'athlete' && aspect_type === 'delete') {
        console.log(`[Strava Webhook] Deauthorization event for strava_owner_id=${owner_id}`);
        handleAthleteDeauthorization(owner_id).catch(err => {
            console.error('Error processing deauth webhook:', err);
        });
    }
});
async function handleAthleteDeauthorization(stravaOwnerId) {
    try {
        await (0, db_1.query)(`UPDATE users 
       SET strava_access_token = NULL, 
           strava_refresh_token = NULL, 
           strava_expires_at = NULL, 
           strava_athlete_id = NULL 
       WHERE strava_athlete_id = $1`, [stravaOwnerId]);
        console.log(`[Strava Webhook] Successfully deauthorized athlete ${stravaOwnerId}`);
    }
    catch (error) {
        console.error(`[Strava Webhook] Error deauthorizing athlete ${stravaOwnerId}:`, error);
    }
}
async function processNewActivity(activityId, stravaOwnerId) {
    try {
        const userResult = await (0, db_1.query)(`SELECT id, telegram_id FROM users WHERE strava_athlete_id = $1`, [stravaOwnerId]);
        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            console.error(`[Strava Webhook] User not found for Strava Athlete ID ${stravaOwnerId}`);
            return;
        }
        const userId = userResult.rows[0].id;
        const telegramId = userResult.rows[0].telegram_id;
        // Обеспечиваем свежий токен
        const accessToken = await ensureValidStravaToken(telegramId);
        // Загружаем данные о конкретной тренировке
        const response = await stravaApi.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const activity = response.data;
        // Если у тренировки есть маршрут (полилиния) и это пешая активность
        const allowedTypes = ['Run', 'Walk', 'Hike', 'VirtualRun', 'TrailRun'];
        if (activity.map?.summary_polyline && allowedTypes.includes(activity.type)) {
            const coordinates = polyline_1.default.decode(activity.map.summary_polyline);
            const insertResult = await (0, db_1.query)(`
          INSERT INTO routes (user_id, strava_activity_id, coordinates)
          VALUES ($1, $2, $3)
          ON CONFLICT (strava_activity_id) DO NOTHING
          RETURNING id
        `, [userId, activity.id, JSON.stringify(coordinates)]);
            // Если вставка успешна (маршрут еще не существовал)
            if (insertResult.rowCount && insertResult.rowCount > 0) {
                try {
                    await (0, territory_1.captureTerritory)(userId, activity.map.summary_polyline);
                    console.log(`[Strava Webhook] Successfully processed and captured territory for activity ${activity.id}`);
                }
                catch (err) {
                    console.error(`[Strava Webhook] Failed to capture territory for activity ${activity.id}:`, err);
                }
            }
            else {
                console.log(`[Strava Webhook] Activity ${activity.id} already exists`);
            }
        }
        else {
            console.log(`[Strava Webhook] Activity ${activity.id} has no map/polyline. Skipped.`);
        }
    }
    catch (error) {
        console.error(`[Strava Webhook] Error processing activity ${activityId}:`, error?.response?.data || error);
    }
}
