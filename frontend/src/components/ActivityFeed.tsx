import { useEffect, useState } from 'react';

type GameEvent = {
  id: string;
  user_id: string;
  event_type: string;
  message: string;
  created_at: string;
  display_name: string | null;
};

type Props = {
  onUserClick?: (userId: string) => void;
};

export function ActivityFeed({ onUserClick }: Props) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isVisible] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (e) {
        console.error('Failed to fetch events', e);
      }
    }
    loadEvents();
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0 || !isVisible) return null;

  // Show only the latest 3 events in the ticker
  const recentEvents = events.slice(0, 3);

  return (
    <div style={{
      position: 'absolute',
      top: '100px', // Below the user name bubble
      left: '16px',
      right: '16px',
      zIndex: 1000,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {recentEvents.map(ev => {
        let color = '#d8a760';
        let icon = '📢';
        if (ev.event_type === 'CAPTURE') { color = '#22c55e'; icon = '🚩'; }
        if (ev.event_type === 'STEAL') { color = '#ef4444'; icon = '⚔️'; }
        if (ev.event_type === 'ORDA_CREATE') { color = '#a855f7'; icon = '👑'; }
        if (ev.event_type === 'ORDA_JOIN') { color = '#3b82f6'; icon = '🤝'; }

        return (
          <div key={ev.id} onClick={() => ev.display_name && ev.event_type !== 'ORDA_CREATE' && ev.user_id && onUserClick?.(ev.user_id)} style={{
            background: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${color}40`,
            borderLeft: `4px solid ${color}`,
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#fff',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.5s ease-out forwards',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: color }}>{ev.display_name || 'Игрок'}</strong> {ev.message}
            </span>
          </div>
        );
      })}

      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}
      </style>
    </div>
  );
}
