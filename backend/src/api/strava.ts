import { Router } from 'express';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { query } from '../db';
import { captureTerritory } from '../db/territory';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

export const stravaRouter = Router();

stravaRouter.get('/auth', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).send('STRAVA_CLIENT_ID или STRAVA_REDIRECT_URI не заданы');
    return;
  }

  const telegramId = req.query.telegram_id;

  if (!telegramId || typeof telegramId !== 'string') {
    res.status(400).send('telegram_id is required');
    return;
  }

  const authUrl = new URL(STRAVA_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('approval_prompt', 'auto');
  authUrl.searchParams.set('scope', process.env.STRAVA_SCOPE ?? 'read,activity:read_all');
  authUrl.searchParams.set('state', telegramId);

  res.redirect(authUrl.toString());
});

stravaRouter.get('/callback', async (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const code = req.query.code;
  const state = req.query.state; // We stored telegram_id here

  if (!clientId || !clientSecret) {
    res.status(500).send('STRAVA_CLIENT_ID или STRAVA_CLIENT_SECRET не заданы');
    return;
  }

  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('code and state are required');
    return;
  }

  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    const tokenData = response.data as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };

    // Update user in DB
    await query(
      `
        UPDATE users
        SET strava_access_token = $1,
            strava_refresh_token = $2,
            strava_expires_at = $3,
            updated_at = NOW()
        WHERE telegram_id = $4
      `,
      [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, state],
    );

    // After saving token, we can trigger the fetch activities right away in the background (or await it)
    await fetchAndSaveActivities(state, tokenData.access_token);

    res
      .status(200)
      .type('html')
      .send('<!doctype html><html><body>Успешно, закрой окно</body></html>');
  } catch (error: any) {
    console.error('Strava callback error:', error?.response?.data || error);
    res.status(502).send('Error communicating with Strava');
  }
});

stravaRouter.post('/sync', async (req, res) => {
  const telegramId = req.body?.telegram_id;
  if (!telegramId) {
    res.status(400).send('telegram_id is required');
    return;
  }

  try {
    const accessToken = await ensureValidStravaToken(String(telegramId));
    await fetchAndSaveActivities(String(telegramId), accessToken);
    res.json({ success: true });
  } catch (error) {
    console.error('Strava sync error:', error);
    res.status(500).send('Error syncing with Strava');
  }
});

async function ensureValidStravaToken(telegramId: string): Promise<string> {
  const userResult = await query<{ strava_access_token: string, strava_refresh_token: string, strava_expires_at: number }>(
    'SELECT strava_access_token, strava_refresh_token, strava_expires_at FROM users WHERE telegram_id = $1',
    [telegramId]
  );

  if (userResult.rowCount === 0 || !userResult.rows[0]) {
    throw new Error('User not found');
  }

  const { strava_access_token, strava_refresh_token, strava_expires_at } = userResult.rows[0];

  if (!strava_access_token || !strava_refresh_token) {
    throw new Error('Strava not connected');
  }

  // Refresh if token expires in less than 5 minutes
  if (Date.now() / 1000 > strava_expires_at - 300) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET is missing');
    }

    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: strava_refresh_token,
    });

    const tokenData = response.data;
    
    await query(
      `
        UPDATE users
        SET strava_access_token = $1,
            strava_refresh_token = $2,
            strava_expires_at = $3,
            updated_at = NOW()
        WHERE telegram_id = $4
      `,
      [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, telegramId],
    );

    return tokenData.access_token;
  }

  return strava_access_token;
}

async function fetchAndSaveActivities(telegramId: string, accessToken: string) {
  try {
    // Get the user ID from our DB to link routes to them
    const userResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (userResult.rowCount === 0 || !userResult.rows[0]) {
      throw new Error(`User not found for telegram_id: ${telegramId}`);
    }

    const userId = userResult.rows[0].id;

    const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        after: oneWeekAgo,
      }
    });

    const activities = response.data;

    for (const activity of activities) {
      if (activity.map?.summary_polyline) {
        // Decode to array of [lat, lng]
        const coordinates = polyline.decode(activity.map.summary_polyline);

        const insertResult = await query(
          `
            INSERT INTO routes (user_id, strava_activity_id, coordinates)
            VALUES ($1, $2, $3)
            ON CONFLICT (strava_activity_id) DO NOTHING
            RETURNING id
          `,
          [userId, activity.id, JSON.stringify(coordinates)]
        );

        if (insertResult.rowCount && insertResult.rowCount > 0) {
          try {
            await captureTerritory(userId, activity.map.summary_polyline);
          } catch (err) {
            console.error(`Failed to capture territory for activity ${activity.id}:`, err);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Error fetching/saving Strava activities:', error?.response?.data || error);
  }
}

stravaRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (typeof mode !== 'string' || mode !== 'subscribe') {
    res.sendStatus(400);
    return;
  }

  if (!expectedToken || typeof token !== 'string' || token !== expectedToken) {
    res.sendStatus(403);
    return;
  }

  if (typeof challenge !== 'string') {
    res.sendStatus(400);
    return;
  }

  res.status(200).send(challenge);
});

stravaRouter.post('/webhook', (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});
