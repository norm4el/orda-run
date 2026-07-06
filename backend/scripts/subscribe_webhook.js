const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function subscribeWebhook() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  
  // ВАЖНО: Замените этот URL на ваш реальный HTTPS адрес (например, ngrok)
  const callbackUrl = 'https://ordarun.app/api/strava/webhook';

  if (!clientId || !clientSecret || !verifyToken) {
    console.error('Ошибка: не заданы STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET или STRAVA_WEBHOOK_VERIFY_TOKEN в .env');
    process.exit(1);
  }

  console.log(`Отправка запроса на создание подписки для callback_url: ${callbackUrl}`);

  try {
    const response = await axios.post('https://www.strava.com/api/v3/push_subscriptions', {
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    });

    console.log('✅ Подписка успешно создана!');
    console.log('Ответ Strava:', response.data);
    
    // Ответ будет содержать ID подписки (id). 
    // Запомните его на случай, если захотите отписаться в будущем.
  } catch (error) {
    console.error('❌ Ошибка при создании подписки:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

subscribeWebhook();
