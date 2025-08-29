import React from 'react';
import ProgressDashboard from './ProgressDashboard';
import { ProgressStats, LearningAnalytics, Achievement, DeckProgress, StudySession } from '../types';

interface DashboardPageProps {
  progressStats: ProgressStats;
  learningAnalytics: LearningAnalytics;
  achievements: Achievement[];
  deckProgress: DeckProgress[];
  studySessions: StudySession[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  progressStats,
  learningAnalytics,
  achievements,
  deckProgress,
  studySessions,
}) => {
  return (
    <ProgressDashboard
      progressStats={progressStats}
      learningAnalytics={learningAnalytics}
      achievements={achievements}
      deckProgress={deckProgress}
      studySessions={studySessions}
    />
  );
};

export default DashboardPage;