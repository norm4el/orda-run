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
                RETURNING
                    id,
                    telegram_id AS "telegramId",
                    username,
                    first_name AS "firstName",
                    display_name AS "displayName",
                    strava_access_token AS "stravaAccessToken",
                    strava_refresh_token AS "stravaRefreshToken",
                    strava_expires_at AS "stravaExpiresAt",
                    color_self AS "colorSelf",
                    color_others AS "colorOthers",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
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
        polygon: GeoJSON.Geometry;
    }>(
        `
            SELECT
                id,
                owner_id,
                ST_AsGeoJSON(polygon)::json AS polygon
            FROM territories
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
                INSERT INTO routes (owner_id, strava_activity_id, coordinates, distance, moving_time, start_date)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (strava_activity_id) DO NOTHING
            `,
            [userId, `manual_${Date.now()}`, JSON.stringify(decodedPoints), distance, duration]
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
                UPDATE users
                SET display_name = $1, 
                    color_self = $2,
                    color_others = $3,
                    updated_at = NOW()
                WHERE telegram_id = $4
                RETURNING
                    id,
                    telegram_id AS "telegramId",
                    username,
                    first_name AS "firstName",
                    display_name AS "displayName",
                    strava_access_token AS "stravaAccessToken",
                    strava_refresh_token AS "stravaRefreshToken",
                    strava_expires_at AS "stravaExpiresAt",
                    color_self AS "colorSelf",
                    color_others AS "colorOthers",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
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