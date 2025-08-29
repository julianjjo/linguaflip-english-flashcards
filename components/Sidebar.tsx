import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  stats: {
    totalCards: number;
    cardsStudiedToday: number;
    currentStreak: number;
    averageAccuracy: number;
  };
  recentDecks: Array<{
    id: number;
    name: string;
    lastStudied: string;
    progress: number;
  }>;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  stats,
  recentDecks
}) => {
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { id: 'study', label: 'Study', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'progress', label: 'Progress', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="mobile-sidebar-overlay md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        mobile-sidebar
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-0 md:w-64
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Navigation</h2>
            <button
              onClick={onClose}
              className="md:hidden touch-target p-3 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 touch-feedback"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center px-4 py-4 text-base font-medium rounded-lg transition-colors duration-200 touch-feedback focus-mobile
                  ${currentView === item.id
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  }
                `}
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Statistics Overview */}
          <div className="px-4 py-4 border-t border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Today's Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{stats.cardsStudiedToday}</div>
                <div className="text-xs text-neutral-600">Cards Studied</div>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-success-600">{stats.currentStreak}</div>
                <div className="text-xs text-neutral-600">Day Streak</div>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-accent-600">{stats.totalCards}</div>
                <div className="text-xs text-neutral-600">Total Cards</div>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-secondary-600">{stats.averageAccuracy}%</div>
                <div className="text-xs text-neutral-600">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Recent Decks */}
          <div className="px-4 py-4 border-t border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Recent Decks</h3>
            <div className="space-y-2">
              {recentDecks.map((deck) => (
                <div key={deck.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900">{deck.name}</div>
                    <div className="text-xs text-neutral-500">{deck.lastStudied}</div>
                  </div>
                  <div className="ml-2">
                    <div className="w-12 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${deck.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;