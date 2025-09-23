import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { studyHistoryStore, progressStatsStore } from '../../stores/study';
import { flashcardsStore } from '../../stores/flashcards';
import {
  dashboardStatsStore,
  dashboardActivityStore,
  dashboardProgressStore,
  dashboardLoadingStore,
  fetchAllDashboardData,
} from '../../stores/dashboard';
import StatsOverview from './StatsOverview';
import StudyHeatmap from '../StudyHeatmap';
import RecentActivity from './RecentActivity';
import ProgressChart from './ProgressChart';
import StudyGoals from './StudyGoals';
import QuickActions from './QuickActions';

interface DashboardLayoutProps {
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  className = '',
}) => {
  const studyHistory = useStore(studyHistoryStore);
  const progressStats = useStore(progressStatsStore);
  const flashcards = useStore(flashcardsStore);

  // Dashboard API data
  const dashboardStats = useStore(dashboardStatsStore);
  const dashboardActivity = useStore(dashboardActivityStore);
  const dashboardProgress = useStore(dashboardProgressStore);
  const loading = useStore(dashboardLoadingStore);

  // Initialize data and fetch from API
  useEffect(() => {
    // Initialize with sample data if empty (for development/offline)
    if (studyHistory.length === 0) {
      const sampleSessions = [
        {
          id: 'session_1',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          cardsReviewed: 15,
          correctAnswers: 12,
          totalTime: 25,
          averageResponseTime: 3.5,
        },
        {
          id: 'session_2',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          cardsReviewed: 20,
          correctAnswers: 18,
          totalTime: 35,
          averageResponseTime: 2.8,
        },
        {
          id: 'session_3',
          date: new Date().toISOString().split('T')[0],
          cardsReviewed: 10,
          correctAnswers: 9,
          totalTime: 18,
          averageResponseTime: 4.2,
        },
      ];
      studyHistoryStore.set(sampleSessions);
    }

    // Fetch dashboard data from API
    fetchAllDashboardData().catch(console.error);
  }, [studyHistory.length]);

  // Show loading state
  if (loading.stats && !dashboardStats) {
    return (
      <div className={`mx-auto max-w-7xl ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
          <span className="ml-3 text-neutral-600 dark:text-neutral-300">
            Cargando dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-7xl ${className}`}>
      {/* Stats Overview */}
      <div className="mb-8">
        <StatsOverview
          flashcards={flashcards}
          progressStats={progressStats}
          studyHistory={studyHistory}
          dashboardStats={dashboardStats}
          loading={loading.stats}
        />
      </div>

      {/* Charts and Heatmap */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Study Heatmap */}
        <div className="lg:col-span-2">
          <StudyHeatmap studySessions={studyHistory} months={6} />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity
            studyHistory={studyHistory}
            dashboardActivity={dashboardActivity}
            loading={loading.activity}
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Progress Chart */}
        <div>
          <ProgressChart
            studyHistory={studyHistory}
            dashboardProgress={dashboardProgress}
            loading={loading.progress}
          />
        </div>

        {/* Study Goals */}
        <div>
          <StudyGoals
            progressStats={progressStats}
            studyHistory={studyHistory}
            dashboardStats={dashboardStats}
            loading={loading.stats}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions dashboardStats={dashboardStats} />
      </div>
    </div>
  );
};

export default DashboardLayout;
