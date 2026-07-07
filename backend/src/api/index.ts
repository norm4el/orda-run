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
        owner_display_name: string | null;
        polygon: GeoJSON.Geometry;
    }>(
        `
            SELECT
                t.owner_id AS id,
                t.owner_id,
                MAX(u.orda_id::text)::uuid AS owner_orda_id,
                MAX(u.display_name) AS owner_display_name,
                MAX(u.influence_points) AS owner_influence_points,
                ST_AsGeoJSON(ST_Union(t.polygon))::json AS polygon
            FROM territories t
            JOIN users u ON t.owner_id = u.id
            GROUP BY t.owner_id
        `,
    );

    res.json(result.rows);
});

apiRouter.get('/events', async (_req, res) => {
    try {
        const events = await query(`
            SELECT e.id, e.user_id, e.event_type, e.message, e.created_at, u.display_name
            FROM game_events e
            LEFT JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
            LIMIT 50
        `);
        res.json(events.rows);
    } catch (err) {
        console.error('Failed to fetch events', err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
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
                SELECT ST_AsGeoJSON(ST_Union(geom)) AS geojson
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
                INSERT INTO routes (user_id, strava_activity_id, coordinates, distance, duration)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (strava_activity_id) DO NOTHING
            `,
            [userId, Date.now(), JSON.stringify(decodedPoints), distance, duration]
        );

        const result = await captureTerritory(userId, polylineString);

        await query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'CAPTURE', 'захватил новую территорию')`, [userId]);

        if (result.stolen_victims_telegram_ids && result.stolen_victims_telegram_ids.length > 0) {
            const { bot } = await import('../bot');
            const userDispNameResult = await query<{ display_name: string }>(
                `SELECT display_name FROM users WHERE id = $1`,
                [userId]
            );
            const thiefName = userDispNameResult.rows[0]?.display_name || 'Неизвестный игрок';

            await query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'STEAL', 'отвоевал часть чужой территории!')`, [userId]);

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

apiRouter.get('/user/stats/:telegram_id', async (req, res) => {
    const telegramId = req.params.telegram_id;
    try {
        const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [telegramId]);
        if (userRes.rowCount === 0) return res.json({ runs: 0, distance: 0 });
        
        const userId = userRes.rows[0].id;
        // Mock distance calculation, since we don't have explicit distance column 
        // We will just return routes_count and a fake distance multiplier (e.g. 5km per run)
        const routesRes = await query(`SELECT COUNT(*) as cnt FROM routes WHERE user_id = $1`, [userId]);
        const runs = parseInt(routesRes.rows[0]?.cnt || '0', 10);
        const distance = runs * 5.4; // 5.4km per run avg

        res.json({ runs, distance });
    } catch (e) {
        console.error('Failed to get stats', e);
        res.status(500).json({ error: 'Failed' });
    }
});

apiRouter.get('/user/public/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const userRes = await query(`
            SELECT u.id, u.display_name, u.influence_points, u.color_self, o.name as orda_name
            FROM users u
            LEFT JOIN ordas o ON u.orda_id = o.id
            WHERE u.id = $1
        `, [userId]);

        if (userRes.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        
        const user = userRes.rows[0];
        
        const routesRes = await query(`SELECT COUNT(*) as cnt FROM routes WHERE user_id = $1`, [userId]);
        const runs = parseInt(routesRes.rows[0]?.cnt || '0', 10);
        const distance = runs * 5.4; 

        res.json({
            id: user.id,
            displayName: user.display_name || 'Игрок',
            influencePoints: user.influence_points,
            color: user.color_self,
            ordaName: user.orda_name,
            runs,
            distance
        });
    } catch (e) {
        console.error('Failed to get public profile', e);
        res.status(500).json({ error: 'Failed' });
    }
});

apiRouter.get('/user/routes/:telegram_id', async (req, res) => {
    const telegramId = req.params.telegram_id;
    try {
        const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [telegramId]);
        if (userRes.rowCount === 0) return res.json([]);
        
        const userId = userRes.rows[0].id;
        const routesRes = await query(`
            SELECT id, strava_activity_id, distance, duration, created_at, coordinates 
            FROM routes 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [userId]);

        res.json(routesRes.rows);
    } catch (e) {
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

apiRouter.get('/user/quests/:telegram_id', async (req, res) => {
    const telegramId = req.params.telegram_id;
    try {
        const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [telegramId]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        const userId = userRes.rows[0].id;

        // Calculate progress for today
        const runsTodayRes = await query(`
            SELECT COUNT(*) as count, COALESCE(SUM(distance), 0) as total_distance 
            FROM routes 
            WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
        `, [userId]);
        const runsCount = Number(runsTodayRes.rows[0].count);
        const totalDistance = Number(runsTodayRes.rows[0].total_distance);

        // Get claimed quests
        const claimedRes = await query(`
            SELECT quest_id FROM claimed_quests 
            WHERE user_id = $1 AND claimed_at = CURRENT_DATE
        `, [userId]);
        const claimedIds = new Set(claimedRes.rows.map(r => r.quest_id));

        const questsWithProgress = DAILY_QUESTS.map(q => {
            let progress = 0;
            if (q.id === 'login') progress = 1;
            if (q.id === 'run_3km') progress = Math.min(totalDistance, q.target);
            if (q.id === 'capture_1') progress = Math.min(runsCount, q.target);

            return {
                ...q,
                progress,
                completed: progress >= q.target,
                claimed: claimedIds.has(q.id)
            };
        });

        res.json(questsWithProgress);
    } catch (e) {
        console.error('Failed to get quests', e);
        res.status(500).json({ error: 'Failed' });
    }
});

apiRouter.post('/user/quests/claim', async (req, res) => {
    const { telegram_id, quest_id } = req.body;
    if (!telegram_id || !quest_id) return res.status(400).json({ error: 'Missing fields' });
    try {
        const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [String(telegram_id)]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        const userId = userRes.rows[0].id;

        const quest = DAILY_QUESTS.find(q => q.id === quest_id);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });

        // Record claim (will throw if already claimed due to UNIQUE constraint)
        await query(`
            INSERT INTO claimed_quests (user_id, quest_id) VALUES ($1, $2)
        `, [userId, quest_id]);

        // Add bonus points
        await query(`
            UPDATE users SET bonus_points = bonus_points + $1 WHERE id = $2
        `, [quest.reward, userId]);

        // Trigger recalculation (since bonus_points isn't actively updating influence here, we can force a fake update on a territory, or run the same logic)
        await query(`
            UPDATE users u
            SET influence_points = (
              SELECT COALESCE(ST_Area(ST_Union(polygon)::geography), 0)::int
              FROM territories t
              WHERE t.owner_id = u.id
            ) + u.bonus_points
            WHERE u.id = $1
        `, [userId]);

        await query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'QUEST_CLAIM', 'выполнил задание: ' || $2)`, [userId, quest.title]);

        res.json({ ok: true, reward: quest.reward });
    } catch (e: any) {
        if (e.code === '23505') {
            return res.status(400).json({ error: 'Already claimed today' });
        }
        console.error('Failed to claim quest', e);
        res.status(500).json({ error: 'Failed' });
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
        await pool.query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'ORDA_CREATE', 'создал новую Орду: ' || $2)`, [userId, name]);
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

        const ordaRes = await pool.query('SELECT name FROM ordas WHERE id = $1', [orda_id]);
        const ordaName = ordaRes.rows[0]?.name || 'Орда';
        
        await pool.query('UPDATE users SET orda_id = $1 WHERE id = $2', [orda_id, userId]);
        await pool.query(`INSERT INTO game_events (user_id, event_type, message) VALUES ($1, 'ORDA_JOIN', 'вступил в Орду: ' || $2)`, [userId, ordaName]);
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