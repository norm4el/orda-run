import { useEffect, useState, useCallback } from 'react';
import { MapArea, type TerritoryFeatureCollection, type RouteFeatureCollection } from './MapArea';
import { BottomNav, type TabType } from './components/BottomNav';
import { ProfileTab } from './components/ProfileTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { RecordTab } from './components/RecordTab';

export type AuthenticatedUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  displayName: string | null;
  stravaAccessToken: string | null;
  stravaRefreshToken: string | null;
  stravaExpiresAt: number | null;
  influencePoints: number;
  colorSelf: string;
  colorOthers: string;
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
  const [routes, setRoutes] = useState<RouteFeatureCollection | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [liveCoordinates, setLiveCoordinates] = useState<[number, number][]>([]);

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void authorize();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const reloadMapData = useCallback(() => {
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

    async function loadRoutes() {
      try {
        const response = await fetch('/api/routes');

        if (!response.ok) {
          throw new Error(`Failed to load routes: ${response.status}`);
        }

        const data = await response.json();

        setRoutes({
          type: 'FeatureCollection',
          features: data.map((route: any) => {
            const lngLatCoords = route.coordinates.map((c: any) => [c[1], c[0]]);
            return {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: lngLatCoords,
              },
              properties: {
                id: route.id,
                owner_id: route.owner_id,
              },
            };
          }),
        });
      } catch (error) {
        console.error(error);
        setRoutes({ type: 'FeatureCollection', features: [] });
      }
    }

    void loadTerritories();
    void loadRoutes();
  }, []);

  useEffect(() => {
    reloadMapData();
  }, [reloadMapData]);

  return (
    <main className="app-shell">
      <div className={`map-container ${activeTab !== 'map' && activeTab !== 'record' ? 'hidden-map' : ''}`}>
        <MapArea territories={territories} routes={routes} currentUser={currentUser} liveCoordinates={liveCoordinates} />
      </div>
      
      {activeTab === 'profile' && (
        <ProfileTab currentUser={currentUser} onUserUpdate={setCurrentUser} reloadMapData={reloadMapData} />
      )}
      
      {activeTab === 'leaderboard' && (
        <LeaderboardTab currentUser={currentUser} />
      )}

      {activeTab === 'record' && (
        <RecordTab 
          currentUser={currentUser} 
          onCoordinatesUpdate={setLiveCoordinates}
          onRunFinished={() => {
            setLiveCoordinates([]);
            reloadMapData();
            setActiveTab('map');
          }} 
        />
      )}

      {activeTab === 'map' && (
        <>
          <div className="hud">
            {authMessage && authMessage !== 'Авторизация вне Telegram' && (
              <div className="hud__chip" style={{ marginBottom: '10px' }}>{authMessage}</div>
            )}
          </div>
          {currentUser && (
            <div style={{
              position: 'absolute',
              bottom: '90px',
              left: '16px',
              right: '16px',
              background: 'var(--surface)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 1000,
              pointerEvents: 'auto'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Твоя Орда</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  {(currentUser.influencePoints / 1000000).toFixed(2)} <span style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: 'normal' }}>км²</span>
                </div>
              </div>
              <div style={{ color: 'var(--text-dim)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          )}
        </>
      )}

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </main>
  );
}

export default App;
