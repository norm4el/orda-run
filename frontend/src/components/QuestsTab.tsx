import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuthenticatedUser } from '../App';

type Quest = {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

type Props = {
  currentUser: AuthenticatedUser;
  reloadMapData: () => void;
};

export function QuestsTab({ currentUser, reloadMapData }: Props) {
  const { t } = useTranslation();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = () => {
    fetch(`/api/user/quests/${currentUser.telegramId}`)
      .then(r => r.json())
      .then(data => {
        setQuests(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQuests();
  }, [currentUser.telegramId]);

  const claimQuest = async (questId: string) => {
    setClaimingId(questId);
    try {
      const res = await fetch('/api/user/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUser.telegramId, quest_id: questId })
      });
      if (res.ok) {
        // Refresh
        fetchQuests();
        reloadMapData(); // Updates user's influence points globally
        await res.json();
        
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500', '#FF8C00']
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="tab-container" style={{ padding: '0 20px', paddingTop: '40px', paddingBottom: '100px', height: '100vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', margin: 0 }}>Ежедневные задания</h2>
      </div>

      <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-dim)' }}>
        Выполняй задания каждый день и получай бонусные очки ранга! Задания обновляются в полночь.
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>{t('loading')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {quests.map(quest => (
            <div key={quest.id} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px',
              borderLeft: quest.claimed ? '4px solid var(--text-dim)' : quest.completed ? '4px solid var(--primary)' : '4px solid rgba(255,255,255,0.1)',
              opacity: quest.claimed ? 0.6 : 1,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>{quest.title}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>{quest.description}</div>
                </div>
                <div style={{ background: 'rgba(216, 167, 96, 0.2)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                  +{quest.reward} XP
                </div>
              </div>

              {!quest.claimed && (
                <div style={{ marginTop: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '5px' }}>
                    <span>{t('q_prog')}</span>
                    <span>{Math.floor(quest.progress)} / {quest.target}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`, height: '100%', background: quest.completed ? 'var(--primary)' : '#4CAF50', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}

              {quest.claimed ? (
                <div style={{ marginTop: '15px', color: 'var(--primary)', fontSize: '14px', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>
                  Выполнено ✓
                </div>
              ) : quest.completed ? (
                <button 
                  onClick={() => claimQuest(quest.id)}
                  disabled={claimingId === quest.id}
                  style={{
                    width: '100%',
                    marginTop: '15px',
                    padding: '12px',
                    background: 'var(--primary)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {claimingId === quest.id ? 'Загрузка...' : 'Забрать награду'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
