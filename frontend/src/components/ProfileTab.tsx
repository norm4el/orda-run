import { useState } from 'react';
import type { AuthenticatedUser } from '../App';

type Props = {
  currentUser: AuthenticatedUser | null;
  onUserUpdate: (user: AuthenticatedUser) => void;
};

export function ProfileTab({ currentUser, onUserUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);

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
          displayName: editName.trim() 
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

  return (
    <div className="content-area">
      <h2 className="tab-title">Профиль</h2>
      
      <div className="profile-card">
        <div className="profile-field">
          <span className="profile-label">Telegram Username</span>
          <span className="profile-value">@{currentUser.username ?? 'неизвестно'}</span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Имя в игре</span>
          {isEditing ? (
            <input
              type="text"
              className="profile-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Введите имя"
              maxLength={32}
              autoFocus
            />
          ) : (
            <span className="profile-value">{currentUser.displayName ?? 'Без имени'}</span>
          )}
        </div>

        <div className="profile-field" style={{ marginTop: '16px' }}>
          {currentUser.stravaAccessToken ? (
            <div style={{ color: '#22c55e', fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Strava подключена
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #fc4c02 0%, #e04300 100%)', boxShadow: '0 4px 12px rgba(252, 76, 2, 0.3)' }}
              onClick={() => {
                const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
                if (!clientId) {
                  alert('VITE_STRAVA_CLIENT_ID is missing');
                  return;
                }
                const redirectUri = 'https://ordarun.app/api/strava/callback';
                window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all&state=${currentUser.telegramId}`;
              }}
            >
              Подключить Strava
            </button>
          )}
        </div>

        <div style={{ marginTop: '8px' }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={() => {
                  setIsEditing(false);
                  setEditName(currentUser.displayName ?? '');
                }}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Редактировать имя
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
