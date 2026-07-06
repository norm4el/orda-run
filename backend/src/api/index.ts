import { Router } from 'express';
import { parse, validate } from '@tma.js/init-data-node';
import { pool, query } from '../db';
import { captureTerritory } from '../db/territory';

export const apiRouter = Router();

type TelegramInitDataUser = {
    id: number;
    first_name: string;
    username?: string | null;
};

type TelegramInitData = {
    user?: TelegramInitDataUser;
};

type AuthenticatedUserResponse = {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    displayName: string | null;
    stravaAccessToken: string | null;
    stravaRefreshToken: string | null;
    stravaExpiresAt: number | null;
    colorSelf: string;
    colorOthers: string;
    ordaId: string | null;
    ordaName: string | null;
    createdAt: string;
    updatedAt: string;
};

const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

function mapUserRow(row: AuthenticatedUserResponse): AuthenticatedUserResponse {
    return row;
}

apiRouter.get('/ping', (_req, res) => {
    res.json({ ok: true });
});

apiRouter.post('/auth', async (req, res) => {
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

    let telegramUser: TelegramInitDataUser;

    try {
        validate(initData, botToken, { expiresIn: INIT_DATA_MAX_AGE_SECONDS });

        const initDataPayload = parse(initData) as TelegramInitData;
        telegramUser = initDataPayload.user as TelegramInitDataUser;

        if (!telegramUser?.id || !telegramUser.first_name) {
            throw new Error('Unauthorized');
        }
    } catch (error) {
        console.error('auth validation error:', error);
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const result = await query<AuthenticatedUserResponse>(
            `
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
                    o.name AS "ordaName",
                    u.created_at AS "createdAt",
                    u.updated_at AS "updatedAt"
                FROM upsert u
                LEFT JOIN ordas o ON u.orda_id = o.id
            `,
            [String(telegramUser.id), telegramUser.username ?? null, telegramUser.first_name, telegramUser.first_name],
        );

        if (result.rowCount === 0 || !result.rows[0]) {
            res.status(500).json({ error: 'Failed to authorize user' });
            return;
        }

        res.json(mapUserRow(result.rows[0]));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to authorize user';
        console.error('auth db error:', error);
        res.status(500).json({ error: message });
    }
});

apiRouter.get('/territories', async (_req, res) => {
    const result = await query<{
        id: string;
        owner_id: string;
        owner_orda_id: string | null;
        polygon: GeoJSON.Geometry;
    }>(
        `
            SELECT
                t.id,
                t.owner_id,
                u.orda_id AS owner_orda_id,
                ST_AsGeoJSON(t.polygon)::json AS polygon
            FROM territories t
            JOIN users u ON t.owner_id = u.id
        `,
    );

    res.json(result.rows);
});

apiRouter.get('/routes', async (_req, res) => {
    try {
        const result = await query<{
            id: string;
            owner_id: string;
            coordinates: [number, number][];
        }>(
            `SELECT id, user_id AS owner_id, coordinates FROM routes`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('routes error:', error);
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
});

apiRouter.get('/territories/:telegram_id', async (req, res) => {
    try {
        const telegramId = Number(req.params.telegram_id);

        if (!Number.isFinite(telegramId)) {
            res.json([]);
            return;
        }

        const userResult = await pool.query<{ id: string }>(
            'SELECT id FROM users WHERE telegram_id = $1::bigint LIMIT 1',
            [telegramId],
        );

        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            res.json([]);
            return;
        }

        const userId = userResult.rows[0].id;
        const territoriesResult = await pool.query<{
            geojson: string;
        }>(
            `
                SELECT ST_AsGeoJSON(geom) AS geojson
                FROM (
                    SELECT polygon AS geom
                    FROM territories
                    WHERE owner_id = $1::uuid
                ) AS territory_geometries
            `,
            [userId],
        );

        const geojsonArray = territoriesResult.rows.map((row) => JSON.parse(row.geojson));

        res.json({ success: true, data: geojsonArray });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('territories/:telegram_id error:', error);
        res.status(500).json({ error: message });
    }
});

apiRouter.post('/test-capture', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const polylineString = req.body?.polyline;

    if ((typeof telegramId !== 'string' && typeof telegramId !== 'number') || typeof polylineString !== 'string') {
        res.status(400).json({ error: 'telegram_id and polyline are required' });
        return;
    }

    try {
        const userResult = await query<{ id: string }>(
            `
                INSERT INTO users (telegram_id)
                VALUES ($1)
                ON CONFLICT (telegram_id) DO UPDATE
                SET telegram_id = EXCLUDED.telegram_id
                RETURNING id
            `,
            [String(telegramId)],
        );

        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userId = userResult.rows[0].id;
        const result = await captureTerritory(userId, polylineString);

        res.json({
            ok: true,
            user_id: userId,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('test-capture error:', error);
        res.status(500).json({ error: message });
    }
});

apiRouter.post('/runs/manual', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const polylineString = req.body?.polyline;
    const distance = req.body?.distance || 0;
    const duration = req.body?.duration || 0;

    if (!telegramId || !polylineString) {
        res.status(400).json({ error: 'telegram_id and polyline are required' });
        return;
    }

    try {
        const userResult = await query<{ id: string }>(
            `SELECT id FROM users WHERE telegram_id = $1`,
            [String(telegramId)],
        );

        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userId = userResult.rows[0].id;

        // Save the manual route
        const decodedPoints = require('@mapbox/polyline').decode(polylineString);
        await query(
            `
                INSERT INTO routes (user_id, strava_activity_id, coordinates)
                VALUES ($1, $2, $3)
                ON CONFLICT (strava_activity_id) DO NOTHING
            `,
            [userId, Date.now(), JSON.stringify(decodedPoints)]
        );

        const result = await captureTerritory(userId, polylineString);

        res.json({
            ok: true,
            user_id: userId,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('manual run error:', error);
        res.status(500).json({ error: message });
    }
});

apiRouter.put('/user/update', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const displayName = req.body?.displayName;
    const colorSelf = req.body?.colorSelf;
    const colorOthers = req.body?.colorOthers;

    if (!telegramId || !displayName || !colorSelf || !colorOthers) {
        res.status(400).json({ error: 'telegram_id, displayName, colorSelf, colorOthers are required' });
        return;
    }

    try {
        const result = await query<AuthenticatedUserResponse>(
            `
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
            `,
            [String(displayName), String(colorSelf), String(colorOthers), String(telegramId)]
        );

        if (result.rowCount === 0 || !result.rows[0]) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(mapUserRow(result.rows[0]));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('user/update error:', error);
        res.status(500).json({ error: message });
    }
});

apiRouter.get('/leaderboard', async (req, res) => {
    try {
        // We get actual users from DB so the current user will be at the top if they are the first one returned by ASC 
        // (or we can just ORDER BY id to get a stable list where the current user is guaranteed to be there).
        // Let's just return real users with fake scores.
        const result = await query<{ id: string; display_name: string; influence_points: number }>(
            `SELECT id, display_name, influence_points FROM users ORDER BY influence_points DESC, created_at ASC LIMIT 10`
        );
        
        const mapped = result.rows.map((u) => ({
            id: u.id,
            displayName: u.display_name || 'Без имени',
            score: u.influence_points
        }));

        res.json(mapped);
    } catch (error) {
        console.error('leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// --- ORDA API ---

apiRouter.get('/orda/leaderboard', async (req, res) => {
    try {
        const result = await query<{ id: string; name: string; score: number }>(
            `SELECT o.id, o.name, COALESCE(SUM(u.influence_points), 0) AS score
             FROM ordas o
             LEFT JOIN users u ON u.orda_id = o.id
             GROUP BY o.id, o.name
             ORDER BY score DESC
             LIMIT 10`
        );
        
        const mapped = result.rows.map((o) => ({
            id: o.id,
            displayName: o.name || 'Без имени',
            score: Number(o.score)
        }));

        res.json(mapped);
    } catch (error) {
        console.error('orda/leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get orda leaderboard' });
    }
});

apiRouter.get('/orda/list', async (_req, res) => {
    try {
        const result = await query(
            `SELECT id, name, khan_id, created_at, (SELECT count(*) FROM users WHERE orda_id = ordas.id) as member_count FROM ordas ORDER BY member_count DESC`
        );
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to list ordas' });
    }
});

apiRouter.post('/orda/create', async (req, res) => {
    const { telegram_id, name } = req.body;
    if (!telegram_id || !name) return res.status(400).json({ error: 'Missing fields' });
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [String(telegram_id)]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });
        const userId = userRes.rows[0].id;

        const insertRes = await pool.query(
            'INSERT INTO ordas (name, khan_id) VALUES ($1, $2) RETURNING id',
            [name, userId]
        );
        const ordaId = insertRes.rows[0].id;

        await pool.query('UPDATE users SET orda_id = $1 WHERE id = $2', [ordaId, userId]);
        res.json({ ok: true, ordaId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create orda' });
    }
});

apiRouter.post('/orda/join', async (req, res) => {
    const { telegram_id, orda_id } = req.body;
    if (!telegram_id || !orda_id) return res.status(400).json({ error: 'Missing fields' });
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [String(telegram_id)]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });
        const userId = userRes.rows[0].id;

        await pool.query('UPDATE users SET orda_id = $1 WHERE id = $2', [orda_id, userId]);
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to join orda' });
    }
});

apiRouter.post('/orda/leave', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'Missing telegram_id' });
    try {
        const userRes = await pool.query('SELECT id, orda_id FROM users WHERE telegram_id = $1', [String(telegram_id)]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });
        const { id: userId, orda_id: ordaId } = userRes.rows[0];

        if (ordaId) {
            await pool.query('UPDATE users SET orda_id = NULL WHERE id = $1', [userId]);
            const khanCheck = await pool.query('SELECT id FROM ordas WHERE id = $1 AND khan_id = $2', [ordaId, userId]);
            if (khanCheck.rowCount && khanCheck.rowCount > 0) {
                // Khan left the Orda. Disband it.
                await pool.query('UPDATE users SET orda_id = NULL WHERE orda_id = $1', [ordaId]);
                await pool.query('DELETE FROM ordas WHERE id = $1', [ordaId]);
            }
        }
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to leave orda' });
    }
});