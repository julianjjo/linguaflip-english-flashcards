import React from 'react';

import Header from './Header';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import { MiniSyncIndicator, OfflineIndicator } from '../src/components/SyncStatusIndicator';
import DataMigrationPrompt from '../src/components/DataMigrationPrompt';

interface MainLayoutProps {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
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
  breadcrumbItems: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
  userId?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  isSidebarOpen,
  onToggleSidebar,
  currentView,
  onViewChange,
  stats,
  recentDecks,
  breadcrumbItems,
  userId,
}) => {
  return (
    <div className="mobile-viewport bg-neutral-50">
      {/* Header */}
      <Header
        onToggleSidebar={onToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => isSidebarOpen && onToggleSidebar()}
          currentView={currentView}
          onViewChange={onViewChange}
          stats={stats}
          recentDecks={recentDecks}
        />

        {/* Main Content */}
        <main className="flex-1 md:ml-0">
          <div className="p-mobile">
            {/* Top Bar with Breadcrumb and Sync Status */}
            <div className="flex items-center justify-between mb-4">
              <Breadcrumb items={breadcrumbItems} />
              {userId && (
                <div className="flex items-center space-x-4">
                  <MiniSyncIndicator userId={userId} />
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="mt-mobile max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Data Migration Prompt */}
      <DataMigrationPrompt
        userId={userId}
        onMigrationComplete={() => {
          // Refresh data after migration
          window.location.reload();
        }}
      />
    </div>
  );
};

export default MainLayout;