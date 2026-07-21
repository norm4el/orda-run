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
exports.bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    console.error('Bot Error:', e);
});
exports.bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply('Не удалось определить Telegram ID.');
        return;
    }
    // Handle deep link for mobile auth: /start login_<session_id>
    const payload = ctx.match;
    if (typeof payload === 'string' && payload.startsWith('login_')) {
        const sessionId = payload.replace('login_', '');
        // Find or create user
        const existingUser = await (0, db_1.query)('SELECT id FROM users WHERE telegram_id = $1 LIMIT 1', [String(telegramId)]);
        let userId;
        if (existingUser.rowCount === 0) {
            const insertRes = await (0, db_1.query)('INSERT INTO users (telegram_id, first_name, username) VALUES ($1, $2, $3) RETURNING id', [String(telegramId), ctx.from?.first_name || 'Player', ctx.from?.username || null]);
            userId = insertRes.rows[0].id;
        }
        else {
            userId = existingUser.rows[0].id;
        }
        // Link session to this user
        await (0, db_1.query)('UPDATE mobile_auth_sessions SET user_id = $1 WHERE session_id = $2', [userId, sessionId]);
        await ctx.reply('✅ Вы успешно авторизованы в приложении! Вернитесь в Orda Run.');
        return;
    }
    const existingUser = await (0, db_1.query)('SELECT id FROM users WHERE telegram_id = $1 LIMIT 1', [String(telegramId)]);
    if (existingUser.rowCount === 0) {
        await (0, db_1.query)('INSERT INTO users (telegram_id) VALUES ($1) ON CONFLICT (telegram_id) DO NOTHING', [String(telegramId)]);
    }
    const webAppUrl = process.env.WEBAPP_URL || process.env.WEB_APP_URL;
    if (!webAppUrl) {
        await ctx.reply('WEBAPP_URL не задан в .env');
        return;
    }
    const welcomeMessage = `Добро пожаловать в Orda Run! 🏃‍♂️
  
Захватывай территории в реальном мире, бегая с включенным Strava!
Нажми кнопку меню "Run" слева внизу, чтобы открыть карту и начать играть.

Если у тебя возникли вопросы, используй команду /help.`;
    await ctx.reply(welcomeMessage);
});
exports.bot.command('help', async (ctx) => {
    const helpMessage = `🛠 Помощь и Поддержка

Orda Run — это игра, где твои реальные пробежки превращаются в захваченные территории на карте.

Если у тебя есть вопросы, баги или предложения, пиши разработчику: @wnorm

Подписывайся на наш официальный канал, чтобы не пропустить обновления: @ordarun`;
    await ctx.reply(helpMessage);
});
exports.bot.on('message', (ctx) => {
    console.log('Received message from Telegram:', ctx.message?.text);
});
