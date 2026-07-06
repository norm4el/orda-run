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
  ordaId: string | null;
  ordaName: string | null;
  createdAt: string;
  updatedAt: string;
};

type TerritoryResponse = {
  id: string;
  owner_id: string;
  owner_orda_id: string | null;
  polygon: GeoJSON.Geometry;
};

function App() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [territories, setTerritories] = useState<TerritoryFeatureCollection | null>(null);
  const [routes, setRoutes] = useState<RouteFeatureCollection | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [liveCoordinates, setLiveCoordinates] = useState<[number, number][]>([]);
  const [ordaMode, setOrdaMode] = useState<boolean>(false);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;

    if (!telegram) {
      setCurrentUser(null);
      return;
    }

    telegram.ready();
    telegram.expand();

    const initData = telegram.initData;

    if (!initData) {
      setCurrentUser(null);
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
      } catch (error) {
        console.error(error);
        setCurrentUser(null);
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
              owner_orda_id: territory.owner_orda_id,
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
        <MapArea territories={territories} routes={routes} currentUser={currentUser} liveCoordinates={liveCoordinates} ordaMode={ordaMode} />
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
          {currentUser && (
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '16px',
              right: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              <div style={{
                background: 'var(--surface)',
                padding: '8px 16px',
                borderRadius: '20px',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: '500',
                pointerEvents: 'auto',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)'
              }}>
                {currentUser.displayName || 'Без имени'}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setOrdaMode(!ordaMode)}
                  style={{
                    background: ordaMode ? 'var(--primary)' : 'var(--surface)',
                    color: ordaMode ? '#000' : 'var(--text-main)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  {ordaMode ? 'Орда' : 'Личный'}
                </button>
                <div 
                  onClick={() => setActiveTab('profile')}
                  style={{
                    background: 'var(--surface)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </div>
              </div>
            </div>
          )}

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
              pointerEvents: 'auto',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  {ordaMode ? (currentUser.ordaName || 'Нет орды') : 'Твоя площадь'}
                </div>
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
