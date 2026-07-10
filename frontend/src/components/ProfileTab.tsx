import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuthenticatedUser } from '../App';
import { getRankFromPoints } from '../utils/ranks';

type Props = {
  currentUser: AuthenticatedUser | null;
  onUserUpdate: (user: AuthenticatedUser) => void;
  reloadMapData: () => void;
  mapTheme?: 'dark' | 'light' | 'positron';
  setMapTheme?: (val: 'dark' | 'light' | 'positron') => void;
  isSoundEnabled?: boolean;
  setIsSoundEnabled?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenHistory?: () => void;
};

export function ProfileTab({ 
  currentUser, 
  onUserUpdate, 
  reloadMapData,
  mapTheme = 'dark',
  setMapTheme,
  isSoundEnabled = true,
  setIsSoundEnabled,
  onOpenHistory
}: Props) {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.displayName ?? '');
  const [colorSelf, setColorSelf] = useState(currentUser?.colorSelf ?? '#d8a760');
  const colorOthers = currentUser?.colorOthers ?? '#2c5a5a';
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ordas, setOrdas] = useState<{ id: string; name: string; member_count: number }[]>([]);
  const [newOrdaName, setNewOrdaName] = useState('');
  const [isOrdaLoading, setIsOrdaLoading] = useState(false);
  const [userStats, setUserStats] = useState({ runs: 0, distance: 0 });

  useEffect(() => {
    if (currentUser?.telegramId) {
      fetch(`/api/user/stats/${currentUser.telegramId}`)
        .then(res => res.json())
        .then(data => setUserStats(data))
        .catch(console.error);
    }
  }, [currentUser?.telegramId]);

  useEffect(() => {
    if (!currentUser?.ordaId) {
      fetch('/api/orda/list')
        .then(res => res.json())
        .then(data => setOrdas(data))
        .catch(console.error);
    }
  }, [currentUser?.ordaId]);

  const handleCreateOrda = async () => {
    if (!newOrdaName.trim()) return;
    setIsOrdaLoading(true);
    try {
      const response = await fetch('/api/orda/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUser!.telegramId, name: newOrdaName.trim() }),
      });
      if (response.ok) {
        const { ordaId } = await response.json();
        onUserUpdate({ ...currentUser!, ordaId, ordaName: newOrdaName.trim() });
        setNewOrdaName('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOrdaLoading(false);
    }
  };

  const handleJoinOrda = async (ordaId: string, ordaName: string) => {
    setIsOrdaLoading(true);
    try {
      const response = await fetch('/api/orda/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUser!.telegramId, orda_id: ordaId }),
      });
      if (response.ok) {
        onUserUpdate({ ...currentUser!, ordaId, ordaName });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOrdaLoading(false);
    }
  };

  const handleLeaveOrda = async () => {
    setIsOrdaLoading(true);
    try {
      const response = await fetch('/api/orda/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUser!.telegramId }),
      });
      if (response.ok) {
        onUserUpdate({ ...currentUser!, ordaId: null, ordaName: null });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOrdaLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="content-area">
        <h2 className="tab-title">Профиль</h2>
        <div className="profile-card">
          <p>Необходимо авторизоваться через Telegram</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!editName.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegram_id: currentUser.telegramId,
          displayName: editName.trim(),
          colorSelf,
          colorOthers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = (await response.json()) as AuthenticatedUser;
      onUserUpdate(updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении профиля');
    } finally {
      setIsSaving(false);
    }
  };

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnectStrava = async () => {
    if (!window.confirm('Вы уверены? Это действие отвяжет Strava и удалит все ваши пробежки и территории из базы данных.')) return;
    
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/user/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUser.telegramId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      const telegram = (window as any).Telegram?.WebApp;
      if (telegram?.showAlert) telegram.showAlert('Аккаунт Strava успешно отключен, а ваши данные удалены.');
      
      onUserUpdate({ ...currentUser, stravaAccessToken: null, stravaRefreshToken: null, influencePoints: 0 });
      reloadMapData();
    } catch (err) {
      console.error(err);
      alert('Ошибка при отключении Strava');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleStravaClick = () => {
    // Используем динамический origin (работает и локально, и на проде)
    const url = `${window.location.origin}/api/strava/auth?telegram_id=${currentUser.telegramId}`;
    
    console.log('Strava Auth URL:', url);

    const telegram = (window as any).Telegram?.WebApp;
    if (telegram?.openLink) {
      telegram.openLink(url);
    } else {
      window.location.href = url;
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUser.telegramId }),
      });

      const telegram = (window as any).Telegram?.WebApp;
      const showMsg = (msg: string) => telegram?.showAlert ? telegram.showAlert(msg) : alert(msg);

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      showMsg('Пробежки успешно синхронизированы! Вернитесь на карту, чтобы увидеть их.');
      reloadMapData();
    } catch (err) {
      console.error(err);
      const telegram = (window as any).Telegram?.WebApp;
      if (telegram?.showAlert) {
        telegram.showAlert('Ошибка при синхронизации пробежек');
      } else {
        alert('Ошибка при синхронизации пробежек');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const rank = getRankFromPoints(currentUser.influencePoints);

  return (
    <div className="content-area" style={{ padding: '0 20px', paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', margin: 0 }}>{t('profile')}</h2>
        {isEditing ? (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}
          >
            {isSaving ? t('saving') : t('save')}
          </button>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => setIsEditing(true)}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--primary)">
             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <>
              <input
                type="text"
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--primary)', color: 'var(--text-main)', fontSize: '20px', textTransform: 'uppercase', width: '100%', marginBottom: '10px', outline: 'none' }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('enter_name')}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t('territory_color')}</span>
                <input type="color" value={colorSelf} onChange={(e) => setColorSelf(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', padding: 0, background: 'none' }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: '20px', fontWeight: '500', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              {currentUser.displayName ?? 'NORM CHEL'}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{rank.title.toUpperCase()}</span>
            {rank.nextMilestone ? (
              <span>{Math.floor(currentUser.influencePoints)} / {rank.nextMilestone} XP</span>
            ) : (
              <span>{t('max_level')}</span>
            )}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
            <div style={{ width: `${Math.min(100, Math.max(0, rank.progress * 100))}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }}></div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>{t('stats')}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '4px' }}>{userStats.runs}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{t('runs')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '4px' }}>{(userStats.distance || 0).toFixed(1)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{t('km')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '4px' }}>{((currentUser?.influencePoints || 0) / 1000000).toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{t('sq_km')}</div>
          </div>
        </div>

        <button 
          onClick={onOpenHistory}
          style={{ width: '100%', marginTop: '20px', background: 'rgba(216, 167, 96, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
        >
          {t('history')}
        </button>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>{t('app_settings')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 15px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{t('language')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t('language_desc')}</div>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => { i18n.changeLanguage('ru'); localStorage.setItem('language', 'ru'); }} 
                style={{ background: i18n.language === 'ru' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', color: i18n.language === 'ru' ? '#000' : 'var(--primary)', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}
              >RU</button>
              <button 
                onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en'); }} 
                style={{ background: i18n.language === 'en' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', color: i18n.language === 'en' ? '#000' : 'var(--primary)', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}
              >EN</button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 15px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{t('map_theme')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{mapTheme === 'dark' ? t('theme_dark') : mapTheme === 'light' ? t('theme_light') : t('theme_positron')}</div>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setMapTheme?.('dark')} 
                style={{ background: mapTheme === 'dark' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', color: mapTheme === 'dark' ? '#000' : 'var(--primary)', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}
              >{t('theme_dark').toUpperCase()}</button>
              <button 
                onClick={() => setMapTheme?.('positron')} 
                style={{ background: mapTheme === 'positron' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', color: mapTheme === 'positron' ? '#000' : 'var(--primary)', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}
              >{t('theme_light').toUpperCase()}</button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 15px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{t('sound')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t('sound_desc')}</div>
            </div>
            <button 
              onClick={() => setIsSoundEnabled?.(prev => !prev)} 
              style={{ background: 'transparent', border: `1px solid ${isSoundEnabled ? 'var(--primary)' : 'var(--text-dim)'}`, color: isSoundEnabled ? 'var(--primary)' : 'var(--text-dim)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
            >
              {isSoundEnabled ? t('on') : t('off')}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Достижения</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
          {[
            { id: 1, icon: '🏇', unlocked: true, desc: 'Начало пути' },
            { id: 2, icon: '🗺️', unlocked: userStats.runs > 0, desc: 'Первая пробежка' },
            { id: 3, icon: '⚔️', unlocked: userStats.distance > 10, desc: 'Пробежал 10км' },
            { id: 4, icon: '👑', unlocked: !!currentUser.ordaId, desc: 'В Орде' }
          ].map(ach => (
            <div key={ach.id} title={ach.desc} style={{ 
              width: '60px', height: '60px', 
              border: `1px solid ${ach.unlocked ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, 
              background: ach.unlocked ? 'rgba(216, 167, 96, 0.1)' : 'transparent',
              transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: ach.unlocked ? '0 0 15px rgba(216, 167, 96, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                transform: 'rotate(-45deg)', 
                color: ach.unlocked ? '#fff' : 'var(--text-dim)',
                fontSize: '24px',
                filter: ach.unlocked ? 'none' : 'grayscale(100%) opacity(0.5)'
              }}>{ach.icon}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Управление Ордой</h3>
        {currentUser.ordaId ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>ВЫ СОСТОИТЕ В ОРДЕ</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '16px' }}>{currentUser.ordaName}</div>
            <button style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontWeight: '500', textTransform: 'uppercase' }} onClick={handleLeaveOrda} disabled={isOrdaLoading}>
              {isOrdaLoading ? 'ОЖИДАЙТЕ...' : 'ПОКИНУТЬ ОРДУ'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>СОЗДАТЬ ОРДУ</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={newOrdaName} 
                  onChange={e => setNewOrdaName(e.target.value)} 
                  placeholder="Название Орды" 
                  style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                />
                <button onClick={handleCreateOrda} disabled={isOrdaLoading || !newOrdaName.trim()} style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold' }}>
                  СОЗДАТЬ
                </button>
              </div>
            </div>

            {ordas.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>ВСТУПИТЬ В ОРДУ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ordas.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{o.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Участников: {o.member_count}</div>
                      </div>
                      <button onClick={() => handleJoinOrda(o.id, o.name)} disabled={isOrdaLoading} style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                        ВСТУПИТЬ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={{ flex: 1, padding: '15px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '500', textTransform: 'uppercase' }} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button style={{ flex: 1, padding: '15px', background: 'transparent', border: '1px solid var(--text-dim)', color: 'var(--text-main)', borderRadius: '8px', fontWeight: '500', textTransform: 'uppercase' }} onClick={() => { setIsEditing(false); setEditName(currentUser.displayName ?? ''); }}>
            Отмена
          </button>
        </div>
      )}

      {!isEditing && (
        <div id="strava-section" style={{ marginTop: '20px' }}>
          {currentUser.stravaAccessToken ? (
            <>
              <button style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '8px', fontWeight: '500', textTransform: 'uppercase', marginBottom: '10px' }} onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? t('syncing') : t('sync_strava')}
              </button>
              <button style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontWeight: '500', textTransform: 'uppercase' }} onClick={handleDisconnectStrava} disabled={isDisconnecting}>
                {isDisconnecting ? t('disconnecting') : t('disconnect_strava')}
              </button>
            </>
          ) : (
            <button style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, display: 'flex', justifyContent: 'center', cursor: 'pointer' }} onClick={handleStravaClick}>
              <img src="/btn_strava_connectwith_orange.svg" alt={t('connect_strava')} style={{ height: '48px', width: 'auto' }} />
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '20px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '500' }}>
          Powered by <span style={{ color: '#fc4c02', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>STRAVA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px' }}>
          <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms.html" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
