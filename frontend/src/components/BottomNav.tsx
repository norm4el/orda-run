export type TabType = 'map' | 'record' | 'quests' | 'leaderboard' | 'profile';

type Props = {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
};

export function BottomNav({ activeTab, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className={`bottom-nav-btn ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => onChange('map')}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
          <line x1="9" y1="3" x2="9" y2="18"></line>
          <line x1="15" y1="6" x2="15" y2="21"></line>
        </svg>
      </button>

      <button
        type="button"
        className={`bottom-nav-btn ${activeTab === 'record' ? 'active' : ''}`}
        onClick={() => onChange('record')}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </button>

      <button
        type="button"
        className={`bottom-nav-btn ${activeTab === 'quests' ? 'active' : ''}`}
        onClick={() => onChange('quests')}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
      </button>

      <button
        type="button"
        className={`bottom-nav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
        onClick={() => onChange('leaderboard')}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20v-6M6 20V10M18 20V4" />
        </svg>
      </button>

      <button
        type="button"
        className={`bottom-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onChange('profile')}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
    </nav>
  );
}
