import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '../App';
import { getRankFromPoints } from '../utils/ranks';

type LeaderboardEntry = {
  id: string;
  displayName: string;
  score: number;
};

type Props = {
  currentUser: AuthenticatedUser | null;
};

export function LeaderboardTab({ currentUser }: Props) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'personal' | 'orda'>('personal');

  useEffect(() => {
    async function loadLeaderboard() {
      setIsLoading(true);
      try {
        const endpoint = mode === 'personal' ? '/api/leaderboard' : '/api/orda/leaderboard';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to load leaderboard');
        
        const result = await response.json();
        // Assuming result is an array, otherwise adapt based on real API
        setData(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error(err);
        // Fallback mock data for MVP if API fails or doesn't exist yet
        setData([
          {
            id: currentUser?.id ?? '1',
            displayName: currentUser?.displayName ?? 'Вы',
            score: 12500,
          },
          { id: '2', displayName: 'Александр', score: 11200 },
          { id: '3', displayName: 'Мария', score: 9800 },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadLeaderboard();
  }, [currentUser, mode]);

  return (
    <div className="content-area">
      <h2 className="tab-title">Лидерборд</h2>

      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        <button 
          onClick={() => setMode('personal')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', background: mode === 'personal' ? 'rgba(255,255,255,0.1)' : 'transparent', color: mode === 'personal' ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s' }}
        >
          Личный
        </button>
        <button 
          onClick={() => setMode('orda')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', background: mode === 'orda' ? 'rgba(255,255,255,0.1)' : 'transparent', color: mode === 'orda' ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s' }}
        >
          Орды
        </button>
      </div>
      
      {isLoading ? (
        <div style={{ color: '#8c9eb5', textAlign: 'center', marginTop: '40px' }}>
          Загрузка...
        </div>
      ) : (
        <div className="leaderboard-list">
          {data.map((item, index) => (
            <div 
              key={item.id} 
              className="leaderboard-item"
              style={{
                borderColor: (mode === 'personal' && item.id === currentUser?.id) || (mode === 'orda' && item.id === currentUser?.ordaId) ? 'var(--primary)' : 'transparent',
                background: (mode === 'personal' && item.id === currentUser?.id) || (mode === 'orda' && item.id === currentUser?.ordaId) ? 'rgba(216, 167, 96, 0.05)' : 'transparent',
                borderRadius: '8px'
              }}
            >
              <span className="leaderboard-rank" style={{ color: item.id === currentUser?.id ? 'var(--primary)' : undefined }}>{index + 1}</span>
              <span className="leaderboard-name" style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{item.displayName}</span>
                {mode === 'personal' && (
                  <span style={{ fontSize: '10px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {getRankFromPoints(item.score).title}
                  </span>
                )}
              </span>
              <span className="leaderboard-score" style={{ color: (mode === 'personal' && item.id === currentUser?.id) || (mode === 'orda' && item.id === currentUser?.ordaId) ? 'var(--primary)' : 'var(--text-dim)', fontSize: '14px' }}>
                {(item.score / 1000000).toFixed(2)} км²
              </span>
            </div>
          ))}
          {data.length === 0 && (
            <div style={{ color: '#8c9eb5', textAlign: 'center', padding: '20px' }}>
              Нет данных
            </div>
          )}
        </div>
      )}
    </div>
  );
}
