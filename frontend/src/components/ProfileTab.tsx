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
