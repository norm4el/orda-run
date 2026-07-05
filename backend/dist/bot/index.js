"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const grammy_1 = require("grammy");
const db_1 = require("../db");
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    throw new Error('BOT_TOKEN is not set in .env');
}
exports.bot = new grammy_1.Bot(botToken);
exports.bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply('Не удалось определить Telegram ID.');
        return;
    }
    const existingUser = await (0, db_1.query)('SELECT id FROM users WHERE telegram_id = $1 LIMIT 1', [String(telegramId)]);
    if (existingUser.rowCount === 0) {
        await (0, db_1.query)('INSERT INTO users (telegram_id) VALUES ($1) ON CONFLICT (telegram_id) DO NOTHING', [String(telegramId)]);
    }
    const webAppUrl = process.env.WEB_APP_URL;
    if (!webAppUrl) {
        await ctx.reply('WEB_APP_URL не задан в .env');
        return;
    }
    const keyboard = new grammy_1.InlineKeyboard().webApp('Открыть карту', webAppUrl);
    await ctx.reply('Добро пожаловать в Орду!', {
        reply_markup: keyboard,
    });
});
