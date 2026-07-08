import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRankFromPoints } from '../utils/ranks';

type PublicUser = {
  id: string;
  displayName: string;
  influencePoints: number;
  color: string;
  ordaName: string | null;
  runs: number;
  distance: number;
};

type Props = {
  userId: string;
  onClose: () => void;
};

export function PublicProfileModal({ userId, onClose }: Props) {
  const { t } = useTranslation();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/public/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>Игрок не найден</div>
        </div>
      </div>
    );
  }

  const rank = getRankFromPoints(user.influencePoints);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, borderTop: `4px solid ${user.color || 'var(--primary)'}` }} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '24px', cursor: 'pointer' }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', marginTop: '10px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: `2px solid ${user.color || 'var(--primary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '30px' }}>👤</span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px' }}>
              [{rank.title.toUpperCase()}]
            </div>
          </div>
        </div>

        {user.ordaName && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🐎</span>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Состоит в Орде</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e' }}>{user.ordaName}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{user.runs}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Пробежки</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{user.distance.toFixed(1)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>КМ</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{(user.influencePoints / 1000000).toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>КМ²</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Достижения</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { id: 1, icon: '🏇', unlocked: true, desc: 'Начало пути' },
              { id: 2, icon: '🗺️', unlocked: user.runs > 0, desc: 'Первая пробежка' },
              { id: 3, icon: '⚔️', unlocked: user.distance > 10, desc: 'Пробежал 10км' },
              { id: 4, icon: '👑', unlocked: !!user.ordaName, desc: 'В Орде' }
            ].map(ach => (
              <div key={ach.id} title={ach.desc} style={{ 
                width: '50px', height: '50px', 
                border: `1px solid ${ach.unlocked ? user.color || 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, 
                background: ach.unlocked ? `${user.color || 'var(--primary)'}20` : 'transparent',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ 
                  color: ach.unlocked ? '#fff' : 'var(--text-dim)',
                  fontSize: '20px',
                  filter: ach.unlocked ? 'none' : 'grayscale(100%) opacity(0.5)'
                }}>{ach.icon}</div>
              </div>
            ))}
          </div>
        </div>

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
