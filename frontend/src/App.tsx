import { useEffect, useState } from 'react';
import { MapArea, type TerritoryFeatureCollection } from './MapArea';
import { BottomNav, type TabType } from './components/BottomNav';
import { ProfileTab } from './components/ProfileTab';
import { LeaderboardTab } from './components/LeaderboardTab';

export type AuthenticatedUser = {
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

type TerritoryResponse = {
  id: string;
  owner_id: string;
  polygon: GeoJSON.Geometry;
};

function App() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authMessage, setAuthMessage] = useState<string>('Авторизация вне Telegram');
  const [territories, setTerritories] = useState<TerritoryFeatureCollection | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('map');

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;

    if (!telegram) {
      setCurrentUser(null);
      setAuthMessage('Авторизация вне Telegram');
      return;
    }

    telegram.ready();
    telegram.expand();

    const initData = telegram.initData;

    if (!initData) {
      setCurrentUser(null);
      setAuthMessage('Авторизация вне Telegram');
      return;
    }

    async function authorize() {
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData }),
        });

        if (!response.ok) {
          throw new Error(`Auth failed: ${response.status}`);
        }

        const user = (await response.json()) as AuthenticatedUser;
        setCurrentUser(user);
        setAuthMessage(user.displayName ?? 'Авторизация выполнена');
      } catch (error) {
        console.error(error);
        setCurrentUser(null);
        setAuthMessage('Не удалось авторизоваться');
      }
    }

    void authorize();
  }, []);

  useEffect(() => {
    async function loadTerritories() {
      try {
        const response = await fetch('/api/territories');

        if (!response.ok) {
          throw new Error(`Failed to load territories: ${response.status}`);
        }

        const data = (await response.json()) as TerritoryResponse[];

        setTerritories({
          type: 'FeatureCollection',
          features: data.map((territory) => ({
            type: 'Feature',
            geometry: territory.polygon,
            properties: {
              id: territory.id,
              owner_id: territory.owner_id,
            },
          })),
        });
      } catch (error) {
        console.error(error);
        setTerritories({ type: 'FeatureCollection', features: [] });
      }
    }

    void loadTerritories();
  }, []);

  return (
    <main className="app-shell">
      <div className={`map-container ${activeTab !== 'map' ? 'hidden-map' : ''}`}>
        <MapArea territories={territories} currentUserId={currentUser?.id ?? null} />
      </div>
      
      {activeTab === 'profile' && (
        <ProfileTab currentUser={currentUser} onUserUpdate={setCurrentUser} />
      )}
      
      {activeTab === 'leaderboard' && (
        <LeaderboardTab currentUser={currentUser} />
      )}

      {activeTab === 'map' && (
        <div className="hud">
          <div className="hud__chip">{authMessage}</div>
        </div>
      )}

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </main>
  );
}

export default App;
