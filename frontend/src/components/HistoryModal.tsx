import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '../App';

type RouteHistory = {
  id: string;
  strava_activity_id: string;
  distance: number;
  duration: number;
  created_at: string;
  coordinates: [number, number][];
};

type Props = {
  currentUser: AuthenticatedUser;
  onClose: () => void;
  onShowRouteOnMap: (coordinates: [number, number][]) => void;
};

function formatTime(seconds: number) {
  const { t } = useTranslation();
  if (!seconds) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function HistoryModal({ currentUser, onClose, onShowRouteOnMap }: Props) {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<RouteHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/routes/${currentUser.telegramId}`)
      .then(res => res.json())
      .then(data => {
        setRoutes(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [currentUser.telegramId]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '24px', cursor: 'pointer' }}
        >
          ×
        </button>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
          История пробежек
        </h2>

        {loading ? (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>Загрузка...</div>
        ) : routes.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>Вы еще не совершили ни одной пробежки.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
            {routes.map(r => (
              <div key={r.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderLeft: '4px solid var(--primary)'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>{formatDate(r.created_at)}</div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>{(r.distance / 1000).toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>КМ</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>{formatTime(r.duration)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>ВРЕМЯ</div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    onShowRouteOnMap(r.coordinates);
                    onClose();
                  }}
                  style={{
                    background: 'var(--primary)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  На карте
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(5px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--surface)',
  width: '100%',
  maxWidth: '500px',
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
  padding: '30px 20px',
  boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
  position: 'relative',
  animation: 'slideUp 0.3s ease-out',
};
