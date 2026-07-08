import { useTranslation } from 'react-i18next';
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
import { QuestsTab } from './components/QuestsTab';
import { AppTour } from './components/AppTour';
import { LandingPage } from './components/LandingPage';

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
  const { t } = useTranslation();
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pastRouteToShow, setPastRouteToShow] = useState<[number, number][] | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [isOutsideTelegram, setIsOutsideTelegram] = useState(false);

  useEffect(() => {
    const telegram: any = window.Telegram?.WebApp;
    const localOnboarding = localStorage.getItem('onboardingCompleted');
    const localTour = localStorage.getItem('tourCompleted');
    
    let usedCloudStorage = false;
    try {
      if (telegram?.isVersionAtLeast && telegram.isVersionAtLeast('6.9') && telegram.CloudStorage) {
        usedCloudStorage = true;
        telegram.CloudStorage.getItem('onboardingCompleted', (_err: any, val: string) => {
          const isOnboardingDone = (val === 'true' || localOnboarding === 'true');
          if (isOnboardingDone) {
            telegram.CloudStorage.getItem('tourCompleted', (_err2: any, tourVal: string) => {
              const isTourDone = (tourVal === 'true' || localTour === 'true');
              if (!isTourDone) setShowTour(true);
            });
          } else {
            setShowOnboarding(true);
          }
        });
      }
    } catch (e) {
      console.warn("CloudStorage error", e);
      usedCloudStorage = false;
    }

    if (!usedCloudStorage) {
      const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
      const hasSeenTour = localStorage.getItem('tourCompleted');
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      } else if (!hasSeenTour) {
        setShowTour(true);
      }
    }
  }, []);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;

    if (!telegram) {
      setCurrentUser(null);
      setIsOutsideTelegram(true);
      return;
    }

    telegram.ready();
    telegram.expand();

    const initData = telegram.initData;

    if (!initData) {
      setCurrentUser(null);
      setIsOutsideTelegram(true);
      return;
    }

  const { t } = useTranslation();
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

  const reloadM
  const { t } = useTranslation();apData = useCallback(() => {
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
        setTerritor
  const { t } = useTranslation();ies({ type: 'FeatureCollection', features: [] });
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

  if (isOutsideTelegram) {
    return <LandingPage />;
  }

  return (
    <main className="app-shell">
      {showOnboarding && (
        <Onboarding onComplete={() => {
          localStorage.setItem('onboardingCompleted', 'true');
          try {
            const tg: any = window.Telegram?.WebApp;
            if (tg?.isVersionAtLeast && tg.isVersionAtLeast('6.9') && tg.CloudStorage) {
              tg.CloudStorage.setItem('onboardingCompleted', 'true');
            }
          } catch(e) {}
          setShowOnboarding(false);
          setShowTour(true);
        }} />
      )}
      
      <AppTour 
        run={showTour && !showOnboarding && !!currentUser} 
        onFinish={() => {
          localStorage.setItem('tourCompleted', 'true');
          try {
            const tg: any = window.Telegram?.WebApp;
            if (tg?.isVersionAtLeast && tg.isVersionAtLeast('6.9') && tg.CloudStorage) {
              tg.CloudStorage.setItem('tourCompleted', 'true');
            }
          } catch(e) {}
          setShowTour(false);
        }} 
        setActiveTab={setActiveTab} 
      />

      <div className={`map-container ${activeTab !== 'map' ? 'hidden-map' : ''}`}>
        <MapArea territories={territories} routes={routes} currentUser={currentUser} liveCoordinates={pastRouteToShow || liveCoordinates} ordaMode={ordaMode} mapTheme={mapTheme} isDrawingMode={isDrawingMode} onPlannedAreaChange={setPlannedArea} onTerritoryClick={(id) => setViewingUserId(id)} />
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
          {t('close_route')}
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

      {activeTab === 'quests' && currentUser && (
        <QuestsTab currentUser={currentUser} reloadMapData={reloadMapData} />
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
          onGoToStrava={() => {
            setActiveTab('profile');
            setTimeout(() => {
              document.getElementById('strava-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  {currentUser.displayName || t('no_name')}
                </div>
                
                <div 
                  className="activity-folder-trigger"
                  onClick={() => setShowActivityFeed(!showActivityFeed)}
                  style={{
                    background: showActivityFeed ? 'var(--primary)' : 'rgba(30, 41, 59, 0.85)',
                    backdropFilter: 'blur(10px)',
                    padding: '8px',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: showActivityFeed ? '#000' : 'var(--text-dim)',
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
              </div>

              <div className="top-user-info" style={{ display: 'flex', gap: '10px' }}>
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
                  {ordaMode ? t('orda') : t('personal')}
                </button>
                <div 
                  className="tour-trigger"
                  onClick={() => setActiveTab('profile')}
                  style={{
                    background: 'rgba(30, 41, 59, 0.85)',
                    backdropFilter: 'blur(10px)',
                    padding: '8px',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
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

          {currentUser && showActivityFeed && <ActivityFeed onUserClick={(id) => setViewingUserId(id)} />}

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
                  {isDrawingMode ? t('plan_area') : (ordaMode ? (currentUser.ordaName || t('no_orda')) : t('your_area'))}
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
                  {isDrawingMode ? t('cancel') : t('plan')}
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
