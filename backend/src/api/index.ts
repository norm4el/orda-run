import { Router } from 'express';
import { pool, query } from '../db';
import { captureTerritory } from '../db/territory';

export const apiRouter = Router();

apiRouter.get('/ping', (_req, res) => {
    res.json({ ok: true });
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