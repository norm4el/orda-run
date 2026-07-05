"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const territory_1 = require("../db/territory");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.get('/ping', (_req, res) => {
    res.json({ ok: true });
});
exports.apiRouter.get('/territories', async (_req, res) => {
    const result = await (0, db_1.query)(`
            SELECT
                id,
                owner_id,
                ST_AsGeoJSON(polygon)::json AS polygon
            FROM territories
        `);
    res.json(result.rows);
});
exports.apiRouter.post('/test-capture', async (req, res) => {
    const telegramId = req.body?.telegram_id;
    const polylineString = req.body?.polyline;
    if ((typeof telegramId !== 'string' && typeof telegramId !== 'number') || typeof polylineString !== 'string') {
        res.status(400).json({ error: 'telegram_id and polyline are required' });
        return;
    }
    try {
        const userResult = await (0, db_1.query)('SELECT id FROM users WHERE telegram_id = $1::bigint LIMIT 1', [String(telegramId)]);
        if (userResult.rowCount === 0 || !userResult.rows[0]) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const result = await (0, territory_1.captureTerritory)(userResult.rows[0].id, polylineString);
        res.json({
            ok: true,
            user_id: userResult.rows[0].id,
            ...result,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('test-capture error:', error);
        res.status(500).json({ error: message });
    }
});
