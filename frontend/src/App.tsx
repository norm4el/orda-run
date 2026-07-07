import { useEffect, useState, useCallback } from 'react';
import { MapArea, type TerritoryFeatureCollection, type RouteFeatureCollection } from './MapArea';
import { BottomNav, type TabType } from './components/BottomNav';
import { ProfileTab } from './components/ProfileTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { RecordTab } from './components/RecordTab';
import { ActivityFeed } from './components/ActivityFeed';
import { Onboarding } from './components/Onboarding';
import { PublicProfileModal } from './components/PublicProfileModal';
import { HistoryModal } from './components/HistoryModal';

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
  owner_display_name: string | null;
  owner_influence_points: number;
  polygon: GeoJSON.Geometry;
};

function App() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [territories, setTerritories] = useState<TerritoryFeatureCollection | null>(null);
  const [routes, setRoutes] = useState<RouteFeatureCollection | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [liveCoordinates, setLiveCoordinates] = useState<[number, number][]>([]);
  const [ordaMode, setOrdaMode] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'positron'>('dark');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [plannedArea, setPlannedArea] = useState<number | null>(null);
  const [plannedPoints, setPlannedPoints] = useState<[number, number][]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pastRouteToShow, setPastRouteToShow] = useState<[number, number][] | null>(null);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

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
              owner_display_name: territory.owner_display_name,
              owner_influence_points: territory.owner_influence_points,
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
      {showOnboarding && (
        <Onboarding onComplete={() => {
          localStorage.setItem('onboardingCompleted', 'true');
          setShowOnboarding(false);
        }} />
      )}
      <div className={`map-container ${activeTab !== 'map' && activeTab !== 'record' ? 'hidden-map' : ''}`}>
        <MapArea territories={territories} routes={routes} currentUser={currentUser} liveCoordinates={pastRouteToShow || liveCoordinates} ordaMode={ordaMode} mapTheme={mapTheme} isDrawingMode={isDrawingMode} onPlannedAreaChange={setPlannedArea} onPlannedPointsChange={setPlannedPoints} onTerritoryClick={(id) => setViewingUserId(id)} />
      </div>
      
      {showHistoryModal && currentUser && (
        <HistoryModal 
          currentUser={currentUser} 
          onClose={() => setShowHistoryModal(false)} 
          onShowRouteOnMap={(coords) => {
            setPastRouteToShow(coords);
            setActiveTab('map');
            // Hide it after some time or add a close button? Let's clear it if they switch tabs.
          }} 
        />
      )}

      {pastRouteToShow && activeTab === 'map' && (
        <button 
          onClick={() => setPastRouteToShow(null)}
          style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.3)', cursor: 'pointer' }}
        >
          ЗАКРЫТЬ МАРШРУТ
        </button>
      )}
      
      {viewingUserId && (
        <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
      
      {activeTab === 'profile' && (
        <ProfileTab 
          currentUser={currentUser} 
          onUserUpdate={setCurrentUser} 
          reloadMapData={reloadMapData} 
          mapTheme={mapTheme}
          setMapTheme={setMapTheme}
          isSoundEnabled={isSoundEnabled}
          setIsSoundEnabled={setIsSoundEnabled}
          onOpenHistory={() => setShowHistoryModal(true)}
        />
      )}
      
      {activeTab === 'leaderboard' && (
        <LeaderboardTab currentUser={currentUser} onUserClick={(id) => setViewingUserId(id)} />
      )}

      <div style={{ display: activeTab === 'record' ? 'block' : 'none' }}>
        <RecordTab 
          currentUser={currentUser} 
          onCoordinatesUpdate={setLiveCoordinates}
          onRunFinished={() => {
            setLiveCoordinates([]);
            setActiveTab('map');
            reloadMapData();
          }} 
        />
      </div>

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

          {currentUser && <ActivityFeed onUserClick={(id) => setViewingUserId(id)} />}

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
                  {isDrawingMode ? 'Площадь плана' : (ordaMode ? (currentUser.ordaName || 'Нет орды') : 'Твоя площадь')}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  {isDrawingMode ? (
                    plannedArea !== null ? (plannedArea / 1000000).toFixed(4) : '0.0000'
                  ) : (
                    (currentUser.influencePoints / 1000000).toFixed(2)
                  )} <span style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: 'normal' }}>км²</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isDrawingMode && plannedArea !== null && (
                  <button
                    onClick={async () => {
                      try {
                        if (plannedPoints.length < 3) return;
                        
                        const polyline = await import('@mapbox/polyline');
                        
                        // plannedPoints are [lng, lat], we need [lat, lng] for polyline
                        const latLngPoints = plannedPoints.map((p: number[]) => [p[1], p[0]] as [number, number]);
                        const polylineStr = polyline.default.encode(latLngPoints);
                        
                        const res = await fetch('/api/test-capture', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            telegram_id: currentUser.telegramId,
                            polyline: polylineStr
                          })
                        });
                        
                        if (res.ok) {
                          const confetti = (await import('canvas-confetti')).default;
                          confetti({
                            particleCount: 150,
                            spread: 70,
                            origin: { y: 0.6 },
                            colors: ['#d8a760', '#22c55e', '#ffffff']
                          });
                          setIsDrawingMode(false);
                          reloadMapData();
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    style={{
                      background: 'var(--primary)',
                      color: '#000',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    Захват
                  </button>
                )}
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  style={{
                    background: isDrawingMode ? 'transparent' : '#22c55e',
                    color: isDrawingMode ? 'var(--text-main)' : '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {isDrawingMode ? 'Отмена' : 'Рисовать'}
                </button>
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
