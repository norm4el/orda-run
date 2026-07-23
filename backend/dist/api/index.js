"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const init_data_node_1 = require("@tma.js/init-data-node");
const db_1 = require("../db");
const territory_1 = require("../db/territory");
const google_auth_library_1 = require("google-auth-library");
const apple_signin_auth_1 = __importDefault(require("apple-signin-auth"));
const crypto_1 = require("crypto");
const profile_1 = require("./profile");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.use(profile_1.profileRouter);
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
function mapUserRow(row) {
    return row;
}
exports.apiRouter.get('/ping', (_req, res) => {
    res.json({ ok: true });
});
exports.apiRouter.post('/auth', async (req, res) => {
    const initData = req.body?.initData;
    if (typeof initData !== 'string' || initData.length === 0) {
        res.status(400).json({ error: 'initData is required' });
        return;
    }
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
        res.status(500).json({ error: 'BOT_TOKEN is not set' });
        return;
    }
    let telegramUser;
    try {
        (0, init_data_node_1.validate)(initData, botToken, { expiresIn: INIT_DATA_MAX_AGE_SECONDS });
        const initDataPayload = (0, init_data_node_1.parse)(initData);
        telegramUser = initDataPayload.user;
        if (!telegramUser?.id || !telegramUser.first_name) {
            throw new Error('Unauthorized');
        }
    }
    catch (error) {
        console.error('auth validation error:', error);
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const result = await (0, db_1.query)(`
                WITH upsert AS (
                    INSERT INTO users (
                        telegram_id,
                        username,
                        first_name,
                        display_name
                    )
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (telegram_id) DO UPDATE
                    SET username = EXCLUDED.username,
                        first_name = COALESCE(users.first_name, EXCLUDED.first_name),
                        display_name = COALESCE(users.display_name, EXCLUDED.display_name, users.first_name, EXCLUDED.first_name),
                        updated_at = NOW()
                    RETURNING *
                )
                SELECT
                    u.id,
                    u.telegram_id AS "telegramId",
                    u.username,
                    u.first_name AS "firstName",
                    u.display_name AS "displayName",
                    u.strava_access_token AS "stravaAccessToken",
                    u.strava_refresh_token AS "stravaRefreshToken",
                    u.strava_expires_at AS "stravaExpiresAt",
                    u.influence_points AS "influencePoints",
                    u.color_self AS "colorSelf",
                    u.color_others AS "colorOthers",
                    u.orda_id AS "ordaId",
                    u.avatar_url AS "avatarUrl",
                    u.social_links AS "socialLinks",
                    o.name AS "ordaName",
                    u.created_at AS "createdAt",
                    u.updated_at AS "updatedAt"
                FROM upsert u
                LEFT JOIN ordas o ON u.orda_id = o.id
            `, [String(telegramUser.id), telegramUser.username ?? null, telegramUser.first_name, telegramUser.first_name]);
        if (result.rowCount === 0 || !result.rows[0]) {
            res.status(500).json({ error: 'Failed to authorize user' });
            return;
        }
        res.json(mapUserRow(result.rows[0]));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to authorize user';
        console.error('auth db error:', error);
        res.status(500).json({ error: message });
    }
});
exports.apiRouter.post('/auth/google', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        res.status(400).json({ error: 'idToken is required' });
        return;
    }
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.sub)
            throw new Error('Invalid token');
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || 'Google User';
        const result = await (0, db_1.query)(`
                WITH upsert AS (
                    INSERT INTO users (google_id, email, display_name, first_name)
                    VALUES ($1, $2, $3, $3)
                    ON CONFLICT (google_id) DO UPDATE
                    SET email = EXCLUDED.email,
                        display_name = COALESCE(users.display_name, EXCLUDED.display_name),
                        updated_at = NOW()
                    RETURNING *
                )
                SELECT
                    u.id, u.telegram_id AS "telegramId", u.username, u.first_name AS "firstName",
                    u.display_name AS "displayName", u.strava_access_token AS "stravaAccessToken",
                    u.strava_refresh_token AS "stravaRefreshToken", u.strava_expires_at AS "stravaExpiresAt",
                    u.influence_points AS "influencePoints", u.color_self AS "colorSelf",
                    u.color_others AS "colorOthers", u.orda_id AS "ordaId", o.name AS "ordaName",
                    u.avatar_url AS "avatarUrl", u.social_links AS "socialLinks",
                    u.created_at AS "createdAt", u.updated_at AS "updatedAt"
                FROM upsert u LEFT JOIN ordas o ON u.orda_id = o.id
            `, [googleId, email || null, name]);
        if (result.rowCount === 0)
            throw new Error('Failed to authorize');
        res.json(mapUserRow(result.rows[0]));
    }
    catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
});
exports.apiRouter.post('/auth/apple', async (req, res) => {
    const { identityToken, fullName } = req.body;
    if (!identityToken) {
        res.status(400).json({ error: 'identityToken is required' });
        return;
    }
    try {
        const payload = await apple_signin_auth_1.default.verifyIdToken(identityToken, {
            audience: process.env.APPLE_CLIENT_ID,
            ignoreExpiration: true, // adjust for production
        });
        const appleId = payload.sub;
        const email = payload.email;
        const name = fullName || 'Apple User';
        const result = await (0, db_1.query)(`
                WITH upsert AS (
                    INSERT INTO users (apple_id, email, display_name, first_name)
                    VALUES ($1, $2, $3, $3)
                    ON CONFLICT (apple_id) DO UPDATE
                    SET email = EXCLUDED.email,
                        display_name = CASE WHEN $3 != 'Apple User' THEN $3 ELSE users.display_name END,
                        updated_at = NOW()
                    RETURNING *
                )
                SELECT
                    u.id, u.telegram_id AS "telegramId", u.username, u.first_name AS "firstName",
                    u.display_name AS "displayName", u.strava_access_token AS "stravaAccessToken",
                    u.strava_refresh_token AS "stravaRefreshToken", u.strava_expires_at AS "stravaExpiresAt",
                    u.influence_points AS "influencePoints", u.color_self AS "colorSelf",
                    u.color_others AS "colorOthers", u.orda_id AS "ordaId", o.name AS "ordaName",
                    u.avatar_url AS "avatarUrl", u.social_links AS "socialLinks",
                    u.created_at AS "createdAt", u.updated_at AS "updatedAt"
                FROM upsert u LEFT JOIN ordas o ON u.orda_id = o.id
            `, [appleId, email || null, name]);
        if (result.rowCount === 0)
            throw new Error('Failed to authorize');
        res.json(mapUserRow(result.rows[0]));
    }
    catch (error) {
        console.error('Apple Auth Error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
});
exports.apiRouter.post('/auth/mobile/init', async (req, res) => {
    try {
        const sessionId = (0, crypto_1.randomBytes)(16).toString('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes valid
        await (0, db_1.query)('INSERT INTO mobile_auth_sessions (session_id, expires_at) VALUES ($1, $2)', [sessionId, expiresAt]);
        res.json({ sessionId });
    }
    catch (error) {
        console.error('Mobile Auth Init Error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
exports.apiRouter.post('/auth/mobile/poll', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
    }
    try {
        const sessionRes = await (0, db_1.query)('SELECT user_id FROM mobile_auth_sessions WHERE session_id = $1 AND expires_at > NOW()', [sessionId]);
        if (sessionRes.rowCount === 0) {
            res.status(404).json({ error: 'Session expired or invalid' });
            return;
        }
        const userId = sessionRes.rows[0].user_id;
        if (!userId) {
            res.json({ status: 'pending' });
            return;
        }
        // Clean up the session
        await (0, db_1.query)('DELETE FROM mobile_auth_sessions WHERE session_id = $1', [sessionId]);
        const result = await (0, db_1.query)(`
                SELECT
                    u.id, u.telegram_id AS "telegramId", u.username, u.first_name AS "firstName",
                    u.display_name AS "displayName", u.strava_access_token AS "stravaAccessToken",
                    u.strava_refresh_token AS "stravaRefreshToken", u.strava_expires_at AS "stravaExpiresAt",
                    u.influence_points AS "influencePoints", u.color_self AS "colorSelf",
                    u.color_others AS "colorOthers", u.orda_id AS "ordaId", o.name AS "ordaName",
                    u.avatar_url AS "avatarUrl", u.social_links AS "socialLinks",
                    u.created_at AS "createdAt", u.updated_at AS "updatedAt"
                FROM users u LEFT JOIN ordas o ON u.orda_id = o.id
                WHERE u.id = $1
            `, [userId]);
        if (result.rowCount === 0)
            throw new Error('User not found');
        res.json({ status: 'success', user: mapUserRow(result.rows[0]) });
    }
    catch (error) {
        console.error('Mobile Auth Poll Error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
exports.apiRouter.get('/territories', async (_req, res) => {
    const result = await (0, db_1.query)(`
            SELECT
                MAX(t.id::text) AS id,
                t.owner_id,
                t.health,
                MAX(u.orda_id::text)::uuid AS owner_orda_id,
                MAX(u.display_name) AS owner_display_name,
                MAX(u.influence_points) AS owner_influence_points,
                MAX(u.avatar_url) AS owner_avatar_url,
                MAX(o.name) AS owner_orda_name,
                MAX(o.avatar_url) AS owner_orda_avatar_url,
                ST_AsGeoJSON(ST_Union(t.polygon))::json AS polygon
            FROM territories t
            JOIN users u ON t.owner_id = u.id
            LEFT JOIN ordas o ON u.orda_id = o.id
            GROUP BY t.owner_id, t.health
        `);
    res.json(result.rows);
});
exports.apiRouter.get('/events', async (_req, res) => {
    try {
        const events = await (0, db_1.query)(`
            SELECT e.id, e.user_id, e.event_type, e.message, e.created_at, u.display_name
            FROM game_events e
            LEFT JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
            LIMIT 50
        `);
        res.json(events.rows);
    }
    catch (err) {
        console.error('Failed to fetch events', err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});
exports.apiRouter.get('/routes', async (_req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT id, user_id AS owner_id, coordinates FROM routes`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('routes error:', error);
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
});
exports.apiRouter.get('/territories/:telegram_id', async (req, res) => {
    try {
        const telegramId = Number(req.params.telegram_id);
        if (!Number.isFinite(telegramId)) {
            res.json([]);
            return;
        }
        const userResult = await db_1.pool.query('SELECT id FROM users WHERE telegram_id = $1::bigint LIMIT 1', [telegramId]);
        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            res.json([]);
            return;
        }
        const userId = userResult.rows[0].id;
        const territoriesResult = await db_1.pool.query(`
                SELECT ST_AsGeoJSON(ST_Union(geom)) AS geojson
                FROM (
                    SELECT polygon AS geom
                    FROM territories
                    WHERE owner_id = $1::uuid
                ) AS territory_geometries
            `, [userId]);
        const geojsonArray = territoriesResult.rows.map((row) => JSON.parse(row.geojson));
        res.json({ success: true, data: geojsonArray });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('territories/:telegram_id error:', error);
        res.status(500).json({ error: message });
    }
});
exports.apiRouter.post('/user/disconnect', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    if (!telegramId) {
        res.status(400).json({ error: 'telegram_id is required' });
        return;
    }
    try {
        const userResult = await (0, db_1.query)(`SELECT id FROM users WHERE telegram_id = $1`, [String(telegramId)]);
        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const userId = userResult.rows[0].id;
        // Delete all territories and runs for this user
        await (0, db_1.query)(`DELETE FROM territories WHERE owner_id = $1`, [userId]);
        await (0, db_1.query)(`DELETE FROM raw_activities WHERE user_id = $1`, [userId]);
        // Remove Strava tokens and reset influence points
        await (0, db_1.query)(`UPDATE users 
             SET strava_access_token = NULL, 
                 strava_refresh_token = NULL, 
                 strava_athlete_id = NULL,
                 influence_points = 0
             WHERE id = $1`, [userId]);
        res.json({ success: true, message: 'Disconnected successfully' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('/user/disconnect error:', error);
        res.status(500).json({ error: message });
    }
});
exports.apiRouter.post('/runs/manual', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const directUserId = req.body?.user_id; // Added support for user_id directly
    const polylineString = req.body?.polyline;
    const distance = req.body?.distance || 0;
    const duration = req.body?.duration || 0;
    if ((!telegramId && !directUserId) || !polylineString) {
        res.status(400).json({ error: 'telegram_id (or user_id) and polyline are required' });
        return;
    }
    try {
        let userId = directUserId;
        if (!userId) {
            const userResult = await (0, db_1.query)(`SELECT id FROM users WHERE telegram_id = $1`, [String(telegramId)]);
            if (userResult.rowCount === 0 || !userResult.rows[0]) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            userId = userResult.rows[0].id;
        }
        // Save the manual route
        const decodedPoints = require('@mapbox/polyline').decode(polylineString);
        await (0, db_1.query)(`
                INSERT INTO routes (user_id, strava_activity_id, coordinates, distance, duration)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (strava_activity_id) DO NOTHING
            `, [userId, Date.now(), JSON.stringify(decodedPoints), distance, Math.round(duration)]);
        const result = await (0, territory_1.captureTerritory)(userId, polylineString);
        await (0, db_1.query)(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'CAPTURE', 'захватил новую территорию')`, [userId]);
        if (result.stolen_victims_telegram_ids && result.stolen_victims_telegram_ids.length > 0) {
            const { bot } = await Promise.resolve().then(() => __importStar(require('../bot')));
            const userDispNameResult = await (0, db_1.query)(`SELECT display_name FROM users WHERE id = $1`, [userId]);
            const thiefName = userDispNameResult.rows[0]?.display_name || 'Неизвестный игрок';
            await (0, db_1.query)(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'STEAL', 'отвоевал часть чужой территории!')`, [userId]);
            for (const victimTgId of result.stolen_victims_telegram_ids) {
                if (victimTgId && victimTgId !== String(telegramId)) {
                    bot.api.sendMessage(victimTgId, `⚠️ Игрок **${thiefName}** откусил кусок вашей территории! Зайдите в приложение, чтобы отвоевать свои земли!`, { parse_mode: 'Markdown' }).catch(e => console.error('Failed to send notification to', victimTgId, e));
                }
            }
        }
        res.json({
            ok: true,
            user_id: userId,
            ...result,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('manual run error:', error);
        res.status(500).json({ error: message });
    }
});
exports.apiRouter.put('/user/update', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const displayName = req.body?.displayName;
    const colorSelf = req.body?.colorSelf;
    const colorOthers = req.body?.colorOthers;
    if (!telegramId || !displayName || !colorSelf || !colorOthers) {
        res.status(400).json({ error: 'telegram_id, displayName, colorSelf, colorOthers are required' });
        return;
    }
    try {
        const result = await (0, db_1.query)(`
                WITH upd AS (
                    UPDATE users
                    SET display_name = $1, 
                        color_self = $2,
                        color_others = $3,
                        updated_at = NOW()
                    WHERE telegram_id = $4
                    RETURNING *
                )
                SELECT
                    u.id,
                    u.telegram_id AS "telegramId",
                    u.username,
                    u.first_name AS "firstName",
                    u.display_name AS "displayName",
                    u.strava_access_token AS "stravaAccessToken",
                    u.strava_refresh_token AS "stravaRefreshToken",
                    u.strava_expires_at AS "stravaExpiresAt",
                    u.color_self AS "colorSelf",
                    u.color_others AS "colorOthers",
                    u.influence_points AS "influencePoints",
                    u.orda_id AS "ordaId",
                    o.name AS "ordaName",
                    u.created_at AS "createdAt",
                    u.updated_at AS "updatedAt"
                FROM upd u
                LEFT JOIN ordas o ON u.orda_id = o.id
            `, [String(displayName), String(colorSelf), String(colorOthers), String(telegramId)]);
        if (result.rowCount === 0 || !result.rows[0]) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(mapUserRow(result.rows[0]));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('user/update error:', error);
        res.status(500).json({ error: message });
    }
});
exports.apiRouter.get('/leaderboard', async (req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT id, display_name, influence_points, avatar_url FROM users ORDER BY influence_points DESC, created_at ASC LIMIT 10`);
        const mapped = result.rows.map((u) => ({
            id: u.id,
            displayName: u.display_name || 'Без имени',
            score: u.influence_points,
            avatarUrl: u.avatar_url
        }));
        res.json(mapped);
    }
    catch (error) {
        console.error('leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});
exports.apiRouter.get('/user/stats/:id', async (req, res) => {
    const idParam = req.params.id;
    try {
        const isUuid = idParam.includes('-');
        let userId = idParam;
        if (!isUuid) {
            const userRes = await (0, db_1.query)(`SELECT id FROM users WHERE telegram_id = $1`, [idParam]);
            if (userRes.rowCount === 0)
                return res.json({ runs: 0, distance: 0 });
            userId = userRes.rows[0].id;
        }
        const routesRes = await (0, db_1.query)(`SELECT COUNT(*) as cnt FROM routes WHERE user_id = $1`, [userId]);
        const runs = parseInt(routesRes.rows[0]?.cnt || '0', 10);
        const distance = runs * 5.4; // 5.4km per run avg
        res.json({ runs, distance });
    }
    catch (e) {
        console.error('Failed to get stats', e);
        res.status(500).json({ error: 'Failed' });
    }
});
exports.apiRouter.get('/user/public/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const userRes = await (0, db_1.query)(`
            SELECT u.id, u.display_name, u.influence_points, u.color_self, u.avatar_url, u.social_links, o.name as orda_name
            FROM users u
            LEFT JOIN ordas o ON u.orda_id = o.id
            WHERE u.id = $1
        `, [userId]);
        if (userRes.rowCount === 0)
            return res.status(404).json({ error: 'Not found' });
        const user = userRes.rows[0];
        const routesRes = await (0, db_1.query)(`SELECT COUNT(*) as cnt FROM routes WHERE user_id = $1`, [userId]);
        const runs = parseInt(routesRes.rows[0]?.cnt || '0', 10);
        const distance = runs * 5.4;
        res.json({
            id: user.id,
            displayName: user.display_name || 'Игрок',
            influencePoints: user.influence_points,
            color: user.color_self,
            ordaName: user.orda_name,
            avatarUrl: user.avatar_url,
            socialLinks: user.social_links,
            runs,
            distance
        });
    }
    catch (e) {
        console.error('Failed to get public profile', e);
        res.status(500).json({ error: 'Failed' });
    }
});
exports.apiRouter.get('/user/routes/:id', async (req, res) => {
    const idParam = req.params.id;
    try {
        const isUuid = idParam.includes('-');
        let userId = idParam;
        if (!isUuid) {
            const userRes = await (0, db_1.query)(`SELECT id FROM users WHERE telegram_id = $1`, [idParam]);
            if (userRes.rowCount === 0)
                return res.json([]);
            userId = userRes.rows[0].id;
        }
        const routesRes = await (0, db_1.query)(`
            SELECT id, strava_activity_id, distance, duration, created_at, coordinates 
            FROM routes 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [userId]);
        res.json(routesRes.rows);
    }
    catch (e) {
        console.error('Failed to get user routes', e);
        res.status(500).json({ error: 'Failed' });
    }
});
// --- QUESTS API ---
const DAILY_QUESTS = [
    { id: 'login', title: 'Разминка', description: 'Зайти в приложение', target: 1, reward: 500 },
    { id: 'run_3km', title: 'Марафонец', description: 'Пробежать 3 км за сегодня', target: 3000, reward: 1500 },
    { id: 'capture_1', title: 'Завоеватель', description: 'Сделать 1 пробежку сегодня', target: 1, reward: 1000 }
];
exports.apiRouter.get('/user/quests/:id', async (req, res) => {
    const idParam = req.params.id;
    try {
        const isUuid = idParam.includes('-');
        let userId = idParam;
        if (!isUuid) {
            const userRes = await (0, db_1.query)(`SELECT id FROM users WHERE telegram_id = $1`, [idParam]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'Not found' });
            userId = userRes.rows[0].id;
        }
        // Calculate progress for today
        const runsTodayRes = await (0, db_1.query)(`
            SELECT COUNT(*) as count, COALESCE(SUM(distance), 0) as total_distance 
            FROM routes 
            WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
        `, [userId]);
        const runsCount = Number(runsTodayRes.rows[0].count);
        const totalDistance = Number(runsTodayRes.rows[0].total_distance);
        // Get claimed quests
        const claimedRes = await (0, db_1.query)(`
            SELECT quest_id FROM claimed_quests 
            WHERE user_id = $1 AND claimed_at = CURRENT_DATE
        `, [userId]);
        const claimedIds = new Set(claimedRes.rows.map(r => r.quest_id));
        const questsWithProgress = DAILY_QUESTS.map(q => {
            let progress = 0;
            if (q.id === 'login')
                progress = 1;
            if (q.id === 'run_3km')
                progress = Math.min(totalDistance, q.target);
            if (q.id === 'capture_1')
                progress = Math.min(runsCount, q.target);
            return {
                ...q,
                progress,
                completed: progress >= q.target,
                claimed: claimedIds.has(q.id)
            };
        });
        res.json(questsWithProgress);
    }
    catch (e) {
        console.error('Failed to get quests', e);
        res.status(500).json({ error: 'Failed' });
    }
});
exports.apiRouter.post('/user/quests/claim', async (req, res) => {
    const { telegram_id, user_id, quest_id } = req.body;
    const targetId = user_id || telegram_id;
    if (!targetId || !quest_id)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        const isUuid = String(targetId).includes('-');
        let userId = targetId;
        if (!isUuid) {
            const userRes = await (0, db_1.query)(`SELECT id FROM users WHERE telegram_id = $1`, [String(targetId)]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'Not found' });
            userId = userRes.rows[0].id;
        }
        const quest = DAILY_QUESTS.find(q => q.id === quest_id);
        if (!quest)
            return res.status(404).json({ error: 'Quest not found' });
        // Record claim (will throw if already claimed due to UNIQUE constraint)
        await (0, db_1.query)(`
            INSERT INTO claimed_quests (user_id, quest_id) VALUES ($1, $2)
        `, [userId, quest_id]);
        // Add bonus points
        await (0, db_1.query)(`
            UPDATE users SET bonus_points = bonus_points + $1 WHERE id = $2
        `, [quest.reward, userId]);
        // Trigger recalculation (since bonus_points isn't actively updating influence here, we can force a fake update on a territory, or run the same logic)
        await (0, db_1.query)(`
            UPDATE users u
            SET influence_points = (
              SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
              FROM territories t
              WHERE t.owner_id = u.id
            ) + u.bonus_points
            WHERE u.id = $1
        `, [userId]);
        await (0, db_1.query)(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'QUEST_CLAIM', 'выполнил задание: ' || $2)`, [userId, quest.title]);
        res.json({ ok: true, reward: quest.reward });
    }
    catch (e) {
        if (e.code === '23505') {
            return res.status(400).json({ error: 'Already claimed today' });
        }
        console.error('Failed to claim quest', e);
        res.status(500).json({ error: 'Failed' });
    }
});
// --- ORDA API ---
exports.apiRouter.get('/orda/leaderboard', async (req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT o.id, o.name, COALESCE(SUM(u.influence_points), 0) AS score
             FROM ordas o
             LEFT JOIN users u ON u.orda_id = o.id
             GROUP BY o.id, o.name
             ORDER BY score DESC
             LIMIT 10`);
        const mapped = result.rows.map((o) => ({
            id: o.id,
            displayName: o.name || 'Без имени',
            score: Number(o.score)
        }));
        res.json(mapped);
    }
    catch (error) {
        console.error('orda/leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get orda leaderboard' });
    }
});
exports.apiRouter.get('/orda/list', async (_req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT id, name, khan_id, avatar_url, created_at, (SELECT count(*) FROM users WHERE orda_id = ordas.id) as member_count FROM ordas ORDER BY member_count DESC`);
        res.json(result.rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to list ordas' });
    }
});
exports.apiRouter.get('/orda/public/:id', async (req, res) => {
    const ordaId = req.params.id;
    try {
        const ordaRes = await (0, db_1.query)(`SELECT o.id, o.name, o.avatar_url, o.created_at,
                    k.display_name as khan_name,
                    (SELECT count(*) FROM users WHERE orda_id = o.id) as member_count,
                    COALESCE((SELECT SUM(influence_points) FROM users WHERE orda_id = o.id), 0) as total_influence
             FROM ordas o
             LEFT JOIN users k ON o.khan_id = k.id
             WHERE o.id = $1`, [ordaId]);
        if (ordaRes.rowCount === 0)
            return res.status(404).json({ error: 'Orda not found' });
        res.json(ordaRes.rows[0]);
    }
    catch (e) {
        console.error('orda/public error:', e);
        res.status(500).json({ error: 'Failed to get public orda info' });
    }
});
exports.apiRouter.post('/orda/create', async (req, res) => {
    const { telegram_id, user_id, name } = req.body;
    const targetId = user_id || telegram_id;
    if (!targetId || !name)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        let userId = targetId;
        const isUuid = String(targetId).includes('-');
        if (!isUuid) {
            const userRes = await db_1.pool.query('SELECT id FROM users WHERE telegram_id = $1', [String(targetId)]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'User not found' });
            userId = userRes.rows[0].id;
        }
        const insertRes = await db_1.pool.query('INSERT INTO ordas (name, khan_id) VALUES ($1, $2) RETURNING id', [name, userId]);
        const ordaId = insertRes.rows[0].id;
        await db_1.pool.query('UPDATE users SET orda_id = $1 WHERE id = $2', [ordaId, userId]);
        await db_1.pool.query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'ORDA_CREATE', 'создал новую Орду: ' || $2)`, [userId, name]);
        res.json({ ok: true, ordaId });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create orda' });
    }
});
exports.apiRouter.post('/orda/join', async (req, res) => {
    const { telegram_id, user_id, orda_id } = req.body;
    const targetId = user_id || telegram_id;
    if (!targetId || !orda_id)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        let userId = targetId;
        const isUuid = String(targetId).includes('-');
        if (!isUuid) {
            const userRes = await db_1.pool.query('SELECT id FROM users WHERE telegram_id = $1', [String(targetId)]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'User not found' });
            userId = userRes.rows[0].id;
        }
        const ordaRes = await db_1.pool.query('SELECT name FROM ordas WHERE id = $1', [orda_id]);
        const ordaName = ordaRes.rows[0]?.name || 'Орда';
        await db_1.pool.query('UPDATE users SET orda_id = $1 WHERE id = $2', [orda_id, userId]);
        await db_1.pool.query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'ORDA_JOIN', 'вступил в Орду: ' || $2)`, [userId, ordaName]);
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to join orda' });
    }
});
exports.apiRouter.post('/orda/leave', async (req, res) => {
    const { telegram_id, user_id } = req.body;
    const targetId = user_id || telegram_id;
    if (!targetId)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        let userId = targetId;
        const isUuid = String(targetId).includes('-');
        if (!isUuid) {
            const userRes = await (0, db_1.query)('SELECT id, orda_id FROM users WHERE telegram_id = $1', [String(targetId)]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'User not found' });
            userId = userRes.rows[0].id;
            var { orda_id: ordaId } = userRes.rows[0];
        }
        else {
            const userRes = await (0, db_1.query)('SELECT orda_id FROM users WHERE id = $1', [targetId]);
            var { orda_id: ordaId } = userRes.rows[0];
        }
        if (ordaId) {
            await (0, db_1.query)('UPDATE users SET orda_id = NULL WHERE id = $1', [userId]);
            const khanCheck = await (0, db_1.query)('SELECT id FROM ordas WHERE id = $1 AND khan_id = $2', [ordaId, userId]);
            if (khanCheck.rowCount && khanCheck.rowCount > 0) {
                // Khan left the Orda. Disband it.
                await db_1.pool.query('UPDATE users SET orda_id = NULL WHERE orda_id = $1', [ordaId]);
                await db_1.pool.query('DELETE FROM ordas WHERE id = $1', [ordaId]);
            }
        }
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to leave orda' });
    }
});
exports.apiRouter.get('/orda/:id/messages', async (req, res) => {
    const ordaId = req.params.id;
    try {
        const result = await (0, db_1.query)(`SELECT m.id, m.user_id, u.telegram_id as frontend_user_id, m.message, m.created_at, u.display_name as user_name
             FROM orda_messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.orda_id = $1
             ORDER BY m.created_at ASC
             LIMIT 100`, [ordaId]);
        res.json(result.rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});
exports.apiRouter.post('/orda/:id/messages', async (req, res) => {
    const ordaId = req.params.id;
    let { user_id, message } = req.body;
    if (!user_id || !message)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        const isUuid = String(user_id).includes('-');
        if (!isUuid) {
            const userRes = await (0, db_1.query)('SELECT id FROM users WHERE telegram_id = $1', [String(user_id)]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'User not found' });
            user_id = userRes.rows[0].id;
        }
        await (0, db_1.query)(`INSERT INTO orda_messages (orda_id, user_id, message) VALUES ($1, $2, $3)`, [ordaId, user_id, message]);
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
exports.apiRouter.get('/drops', async (req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT id, lat, lng, type, value, is_active FROM loot_drops WHERE is_active = true`);
        res.json(result.rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to get drops' });
    }
});
exports.apiRouter.post('/drops/claim', async (req, res) => {
    const { telegram_id, user_id, drop_id } = req.body;
    const targetId = user_id || telegram_id;
    if (!targetId || !drop_id)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        let userId = targetId;
        const isUuid = String(targetId).includes('-');
        if (!isUuid) {
            const userRes = await (0, db_1.query)('SELECT id FROM users WHERE telegram_id = $1', [String(targetId)]);
            if (userRes.rowCount === 0)
                return res.status(404).json({ error: 'User not found' });
            userId = userRes.rows[0].id;
        }
        // Check if active
        const dropRes = await (0, db_1.query)('SELECT type, value, is_active FROM loot_drops WHERE id = $1 FOR UPDATE', [drop_id]);
        if (dropRes.rowCount === 0)
            return res.status(404).json({ error: 'Drop not found' });
        const drop = dropRes.rows[0];
        if (!drop.is_active) {
            return res.status(400).json({ error: 'Drop already claimed' });
        }
        // Deactivate drop
        await (0, db_1.query)('UPDATE loot_drops SET is_active = false WHERE id = $1', [drop_id]);
        // Reward user
        if (drop.type === 'XP_BOOST') {
            await (0, db_1.query)('UPDATE users SET influence_points = influence_points + $1 WHERE id = $2', [drop.value, userId]);
            await (0, db_1.query)(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'QUEST_CLAIM', 'нашел сундук с Ордой и получил +' || $2 || ' XP!')`, [userId, drop.value]);
        }
        res.json({ ok: true, type: drop.type, value: drop.value });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to claim drop' });
    }
});
