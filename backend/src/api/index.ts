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