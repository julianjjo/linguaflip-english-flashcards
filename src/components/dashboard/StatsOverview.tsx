import React from 'react';
import type { FlashcardData, ProgressStats, StudySession } from '../../types';
import type { DashboardStats } from '../../stores/dashboard';

interface StatsOverviewProps {
  flashcards: FlashcardData[];
  progressStats: ProgressStats;
  studyHistory: StudySession[];
  dashboardStats?: DashboardStats | null;
  loading?: boolean;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  flashcards, 
  progressStats, 
  studyHistory,
  dashboardStats,
  loading = false
}) => {
  // Use API data if available, otherwise fall back to local calculations
  const getStats = () => {
    if (dashboardStats) {
      return {
        totalCards: dashboardStats.totalCards,
        masteredCards: dashboardStats.masteredCards,
        currentStreak: dashboardStats.currentStreak,
        todayStudyTime: dashboardStats.todayStudyTime
      };
    }

    // Fallback calculations
    const today = new Date().toDateString();
    const todaySessions = studyHistory.filter(session =>
      new Date(session.date).toDateString() === today
    );
    const todayStudyTime = todaySessions.reduce((sum, session) => sum + session.totalTime, 0);
    const masteredCards = flashcards.filter(card => 
      card.easinessFactor >= 2.5 && card.repetitions >= 3
    ).length;

    return {
      totalCards: flashcards.length,
      masteredCards,
      currentStreak: progressStats.currentStreak,
      todayStudyTime
    };
  };

  const statsData = getStats();

  const statCards = [
    {
      title: 'Total de Tarjetas',
      value: statsData.totalCards,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'primary',
      bgColor: 'bg-primary-100 dark:bg-primary-900',
      textColor: 'text-primary-600 dark:text-primary-400'
    },
    {
      title: 'Tarjetas Dominadas',
      value: statsData.masteredCards,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'success',
      bgColor: 'bg-success-100 dark:bg-success-900',
      textColor: 'text-success-600 dark:text-success-400'
    },
    {
      title: 'Racha Actual',
      value: statsData.currentStreak,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'accent',
      bgColor: 'bg-accent-100 dark:bg-accent-900',
      textColor: 'text-accent-600 dark:text-accent-400'
    },
    {
      title: 'Tiempo Hoy',
      value: `${statsData.todayStudyTime}m`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'secondary',
      bgColor: 'bg-secondary-100 dark:bg-secondary-900',
      textColor: 'text-secondary-600 dark:text-secondary-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div 
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-gray-600 hover:shadow-xl transition-shadow duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {stat.title}
              </p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                <p className={`text-2xl font-bold text-neutral-900 dark:text-neutral-100`}>
                  {stat.value}
                </p>
              )}
            </div>
            <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
              <div className={stat.textColor}>
                {stat.icon}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;