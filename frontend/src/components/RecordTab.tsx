import { useState, useEffect, useRef } from 'react';
import polyline from '@mapbox/polyline';
import { useTranslation } from 'react-i18next';
import type { AuthenticatedUser } from '../App';

type Props = {
  currentUser: AuthenticatedUser | null;
  onCoordinatesUpdate: (coords: [number, number][]) => void;
  onRunFinished: () => void;
  onGoToStrava?: () => void;
};

// Haversine formula to calculate distance between two coordinates in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function RecordTab({ currentUser, onCoordinatesUpdate, onRunFinished, onGoToStrava }: Props) {
  const { t } = useTranslation();
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // We need refs to keep track of current state inside the watchPosition callback
  const coordsRef = useRef<[number, number][]>([]);
  const distanceRef = useRef(0);

  useEffect(() => {
    coordsRef.current = coordinates;
    distanceRef.current = distanceMeters;
    onCoordinatesUpdate(coordinates);
  }, [coordinates, distanceMeters, onCoordinatesUpdate]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const startTracking = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(t('geo_not_supported'));
      return;
    }

    await requestWakeLock();

    setCoordinates([]);
    setDistanceMeters(0);
    setElapsedSeconds(0);
    setIsTracking(true);

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        // Ignore very inaccurate readings
        if (accuracy > 50) return;

        const newCoord: [number, number] = [latitude, longitude];

        setCoordinates((prev) => {
          const newCoords = [...prev, newCoord];
          if (prev.length > 0) {
            const lastCoord = prev[prev.length - 1];
            const dist = getDistance(lastCoord[0], lastCoord[1], latitude, longitude);
            setDistanceMeters((d) => d + dist);
          }
          return newCoords;
        });
      },
      (err) => {
        console.error(err);
        setError(`${t('gps_error')} ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  };

  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await releaseWakeLock();
    setIsTracking(false);
  };

  const saveRun = async () => {
    if (coordinates.length < 2) {
      setError(t('too_short'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (!currentUser) throw new Error(t('user_unauth'));
      
      const polylineStr = polyline.encode(coordinates);
      
      const response = await fetch('/api/runs/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: currentUser.telegramId,
          polyline: polylineStr,
          distance: distanceMeters,
          duration: elapsedSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error(t('save_error'));
      }

      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d8a760', '#22c55e', '#ffffff']
      });

      setCoordinates([]);
      setDistanceMeters(0);
      setElapsedSeconds(0);

      onRunFinished(); // this will reload map data and switch tab
    } catch (err: any) {
      setError(err.message || t('network_error'));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current !== null) clearInterval(timerRef.current);
      releaseWakeLock();
    };
  }, []);

  const distanceKm = (distanceMeters / 1000).toFixed(2);
  const currentPace = distanceMeters > 0 ? (elapsedSeconds / 60) / (distanceMeters / 1000) : 0;
  const paceMins = Math.floor(currentPace);
  const paceSecs = Math.floor((currentPace - paceMins) * 60);


  return (
    <div className="tab-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100vh - 72px)', zIndex: 1000, padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', paddingTop: '40px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', margin: 0 }}>{t('tracker')}</h2>
        <div onClick={onGoToStrava} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)' }}>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
      </div>
      
      {error && (
        <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '20px', width: '100%', textAlign: 'center', pointerEvents: 'auto' }}>
          {error}
        </div>
      )}

      {isTracking && (
        <div style={{ background: 'rgba(91, 179, 255, 0.1)', border: '1px solid var(--primary)', color: 'var(--text-main)', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', pointerEvents: 'auto' }}>
          {t('switch_to_map')}
        </div>
      )}

      {!currentUser?.stravaAccessToken && (
        <div style={{ background: 'rgba(252, 76, 2, 0.1)', border: '1px solid #fc4c02', color: 'var(--text-main)', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', pointerEvents: 'auto', flexShrink: 0 }}>
          <div style={{ marginBottom: '12px', fontSize: '14px' }}>{t('strava_prompt')}</div>
          <button onClick={onGoToStrava} style={{ background: '#fc4c02', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {t('connect_strava_btn')}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', pointerEvents: 'none', background: 'var(--surface)', padding: '30px', borderRadius: '32px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('kilometers')}</div>
          <div style={{ fontSize: '42px', fontWeight: '500', color: 'var(--text-main)', lineHeight: '1' }}>{distanceKm}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('time')}</div>
          <div style={{ fontSize: '42px', fontWeight: '500', color: 'var(--text-main)', lineHeight: '1' }}>{formatTime(elapsedSeconds)}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('pace')}</div>
          <div style={{ fontSize: '28px', fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>{distanceMeters > 0 ? `${paceMins}:${paceSecs.toString().padStart(2, '0')}` : '0:00'} <span style={{ fontSize: '16px', color: 'var(--text-dim)' }}>/км</span></div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('calories')}</div>
          <div style={{ fontSize: '28px', fontWeight: '500', color: 'var(--text-main)' }}>{Math.floor(distanceMeters * 0.07)}</div>
        </div>
      </div>
      
      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 'auto', marginBottom: '20px', gap: '30px', pointerEvents: 'auto', zIndex: 10, flexShrink: 0 }}>
        <div style={{ color: 'var(--text-dim)', padding: '15px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        
        {!isTracking ? (
          coordinates.length > 0 ? (
            <button
              onClick={saveRun}
              disabled={isSaving}
              style={{ width: '120px', height: '120px', borderRadius: '50%', fontSize: '16px', fontWeight: '500', background: 'var(--primary)', color: '#000', pointerEvents: 'auto', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
            >
              {isSaving ? t('wait') : t('capture')}
            </button>
          ) : (
            <button
              onClick={startTracking}
              style={{ width: '120px', height: '120px', borderRadius: '50%', fontSize: '16px', fontWeight: '500', background: 'transparent', color: 'var(--primary)', border: '2px solid var(--primary)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
            >
              {t('start')}
            </button>
          )
        ) : (
          <button
            onClick={stopTracking}
            style={{ width: '120px', height: '120px', borderRadius: '50%', fontSize: '16px', fontWeight: '500', background: 'transparent', color: 'var(--primary)', border: '2px solid var(--primary)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
          >
            {t('pause')}
          </button>
        )}
        
        <div style={{ color: 'var(--text-dim)', padding: '15px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
        </div>
      </div>
      

    </div>
  );
}
