import { useState, useEffect, useRef } from 'react';
import polyline from '@mapbox/polyline';
import type { AuthenticatedUser } from '../App';

type Props = {
  currentUser: AuthenticatedUser | null;
  onCoordinatesUpdate: (coords: [number, number][]) => void;
  onRunFinished: () => void;
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

export function RecordTab({ currentUser, onCoordinatesUpdate, onRunFinished }: Props) {
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
      setError('Геолокация не поддерживается вашим устройством');
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
        setError(`Ошибка GPS: ${err.message}`);
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
      setError('Слишком короткая пробежка (нужно хотя бы 2 точки)');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (!currentUser) throw new Error('Пользователь не авторизован');
      
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
        throw new Error('Ошибка при сохранении пробежки');
      }

      onRunFinished(); // this will reload map data and switch tab
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
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
  const formattedPace = distanceMeters > 0 ? `${paceMins}:${paceSecs.toString().padStart(2, '0')} /км` : '0:00 /км';

  return (
    <div className="tab-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100vh - 72px)', zIndex: 1000, padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', pointerEvents: 'auto', background: 'rgba(7, 17, 31, 0.7)', padding: '10px 20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>Тренировка</h2>
      
      {error && (
        <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '20px', width: '100%', textAlign: 'center', pointerEvents: 'auto' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box', marginBottom: '40px', pointerEvents: 'auto' }}>
        <div style={{ background: 'rgba(7, 17, 31, 0.8)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00ffaa' }}>{distanceKm}</div>
          <div style={{ fontSize: '14px', color: '#888' }}>километров</div>
        </div>
        <div style={{ background: 'rgba(7, 17, 31, 0.8)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00ffaa' }}>{formatTime(elapsedSeconds)}</div>
          <div style={{ fontSize: '14px', color: '#888' }}>время</div>
        </div>
        <div style={{ gridColumn: '1 / -1', background: 'rgba(7, 17, 31, 0.8)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00ffaa' }}>{formattedPace}</div>
          <div style={{ fontSize: '14px', color: '#888' }}>текущий темп</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {!isTracking ? (
        coordinates.length > 0 ? (
          <div style={{ display: 'flex', gap: '10px', width: '100%', boxSizing: 'border-box', pointerEvents: 'auto' }}>
            <button
              onClick={() => { setCoordinates([]); setDistanceMeters(0); setElapsedSeconds(0); }}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '20px', fontSize: '18px', background: 'rgba(7, 17, 31, 0.9)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px', color: '#fff' }}
            >
              Сбросить
            </button>
            <button
              onClick={saveRun}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 2, padding: '20px', fontSize: '18px', background: '#00ffaa', color: '#000', border: 'none', borderRadius: '12px' }}
            >
              {isSaving ? 'Сохраняем...' : 'Сохранить и захватить'}
            </button>
          </div>
        ) : (
          <button
            onClick={startTracking}
            className="btn btn-primary"
            style={{ width: '200px', height: '200px', borderRadius: '50%', fontSize: '32px', fontWeight: 'bold', background: '#00ffaa', color: '#000', boxShadow: '0 10px 30px rgba(0, 255, 170, 0.3)', pointerEvents: 'auto', border: 'none' }}
          >
            СТАРТ
          </button>
        )
      ) : (
        <button
          onClick={stopTracking}
          className="btn btn-primary"
          style={{ width: '200px', height: '200px', borderRadius: '50%', fontSize: '32px', fontWeight: 'bold', background: '#ff4444', color: '#fff', boxShadow: '0 10px 30px rgba(255, 68, 68, 0.3)', pointerEvents: 'auto', border: 'none' }}
        >
          СТОП
        </button>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '10px 20px', background: 'rgba(7, 17, 31, 0.7)', borderRadius: '8px', backdropFilter: 'blur(10px)', pointerEvents: 'auto' }}>
        Держите экран включенным во время бега. iOS/Android могут остановить запись, если экран погаснет.
      </div>
    </div>
  );
}
