"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTelegramWebAppData = void 0;
const crypto_1 = require("crypto");
function parseTelegramInitData(initData) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        return null;
    }
    const entries = Array.from(params.entries())
        .filter(([key]) => key !== 'hash')
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n');
    return { hash, dataCheckString };
}
const validateTelegramWebAppData = (req, res, next) => {
    const initData = req.body?.initData;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (typeof initData !== 'string' || !botToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const parsed = parseTelegramInitData(initData);
    if (!parsed) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const computedHash = (0, crypto_1.createHmac)('sha256', botToken)
        .update(parsed.dataCheckString)
        .digest('hex');
    const computedHashBuffer = Buffer.from(computedHash, 'hex');
    const providedHashBuffer = Buffer.from(parsed.hash, 'hex');
    if (computedHashBuffer.length !== providedHashBuffer.length) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (!(0, crypto_1.timingSafeEqual)(computedHashBuffer, providedHashBuffer)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
};
exports.validateTelegramWebAppData = validateTelegramWebAppData;
