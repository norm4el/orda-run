import { Bot, InlineKeyboard } from 'grammy';
import { query } from '../db';

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error('BOT_TOKEN is not set in .env');
}

export const bot = new Bot(botToken);

bot.command('start', async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply('Не удалось определить Telegram ID.');
    return;
  }

  const existingUser = await query<{ id: string }>(
    'SELECT id FROM users WHERE telegram_id = $1 LIMIT 1',
    [String(telegramId)],
  );

  if (existingUser.rowCount === 0) {
    await query(
      'INSERT INTO users (telegram_id) VALUES ($1) ON CONFLICT (telegram_id) DO NOTHING',
      [String(telegramId)],
    );
  }

  const webAppUrl = process.env.WEB_APP_URL;

  if (!webAppUrl) {
    await ctx.reply('WEB_APP_URL не задан в .env');
    return;
  }

  const keyboard = new InlineKeyboard().webApp('Run', webAppUrl);

  const welcomeMessage = `Добро пожаловать в Orda Run! 🏃‍♂️
  
Захватывай территории в реальном мире, бегая с включенным Strava!
Нажми кнопку **Run** ниже, чтобы открыть карту и начать играть.

Если у тебя возникли вопросы, используй команду /help.`;

  await ctx.reply(welcomeMessage, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
});

bot.command('help', async (ctx) => {
  const helpMessage = `🛠 **Помощь и Поддержка**

Orda Run — это игра, где твои реальные пробежки превращаются в захваченные территории на карте.

Если у тебя есть вопросы, баги или предложения, пиши разработчику: @wnorm

Подписывайся на наш официальный канал, чтобы не пропустить обновления: @ordarun`;

  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
  });
});
