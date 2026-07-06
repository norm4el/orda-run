import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '../App';

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

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard');
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
  }, [currentUser]);

  return (
    <div className="content-area">
      <h2 className="tab-title">Лидерборд</h2>
      
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
                borderColor: item.id === currentUser?.id ? 'rgba(91, 179, 255, 0.5)' : undefined,
                background: item.id === currentUser?.id ? 'rgba(91, 179, 255, 0.1)' : undefined
              }}
            >
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-name">{item.displayName}</span>
              <span className="leaderboard-score">{(item.score / 1000000).toFixed(2)} км²</span>
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
