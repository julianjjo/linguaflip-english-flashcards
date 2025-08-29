import React from 'react';
import type { ProgressStats, LearningAnalytics, Achievement, DeckProgress, StudySession } from '../types';
import StudyHeatmap from './StudyHeatmap';
import { MiniSyncIndicator } from '../src/components/SyncStatusIndicator';

interface ProgressDashboardProps {
   progressStats: ProgressStats;
   learningAnalytics: LearningAnalytics;
   achievements: Achievement[];
   deckProgress: DeckProgress[];
   studySessions: StudySession[];
   userId?: string;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
   progressStats,
   learningAnalytics,
   achievements,
   deckProgress,
   studySessions,
   userId,
}) => {
  const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: string }> = ({
    title,
    value,
    subtitle,
    icon,
  }) => {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </div>
    );
  };

  const ProgressBar: React.FC<{ progress: number; label: string; color?: string }> = ({
    progress,
    label,
    color = 'bg-blue-500',
  }) => {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${color} transition-all duration-300`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const CircularProgress: React.FC<{ progress: number; size?: number; label: string }> = ({
    progress,
    size = 120,
    label,
  }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{Math.round(progress)}%</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">{label}</p>
      </div>
    );
  };

  const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    return (
      <div className={`p-4 rounded-lg border-2 transition-all ${
        achievement.unlockedAt
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{achievement.icon}</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
            <p className="text-sm text-gray-600">{achievement.description}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{achievement.current}/{achievement.target}</span>
                <span>{Math.round(achievement.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    achievement.unlockedAt ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(achievement.progress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          {achievement.unlockedAt && (
            <div className="text-green-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center relative">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Dashboard</h1>
        <p className="text-gray-600">Track your language learning journey</p>
        {userId && (
          <div className="absolute top-0 right-0">
            <MiniSyncIndicator userId={userId} />
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Cards"
          value={progressStats.totalCards}
          subtitle={`${progressStats.cardsMastered} mastered`}
          icon="📚"
        />
        <StatCard
          title="Current Streak"
          value={`${progressStats.currentStreak} days`}
          subtitle={`Longest: ${progressStats.longestStreak} days`}
          icon="🔥"
        />
        <StatCard
          title="Study Time"
          value={`${Math.round(progressStats.totalStudyTime)}m`}
          subtitle="Total time studied"
          icon="⏰"
        />
        <StatCard
          title="Accuracy"
          value={`${Math.round(progressStats.averageAccuracy)}%`}
          subtitle="Average performance"
          icon="🎯"
        />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Circular Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Progress</h3>
          <div className="flex justify-center">
            <CircularProgress
              progress={progressStats.totalCards > 0 ? (progressStats.cardsMastered / progressStats.totalCards) * 100 : 0}
              label="Cards Mastered"
            />
          </div>
        </div>

        {/* Progress Bars */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Learning Progress</h3>
          <ProgressBar
            progress={progressStats.totalCards > 0 ? (progressStats.cardsMastered / progressStats.totalCards) * 100 : 0}
            label="Mastered Cards"
            color="bg-green-500"
          />
          <ProgressBar
            progress={progressStats.totalCards > 0 ? (progressStats.cardsInProgress / progressStats.totalCards) * 100 : 0}
            label="Cards in Progress"
            color="bg-blue-500"
          />
          <ProgressBar
            progress={progressStats.totalCards > 0 ? (progressStats.cardsNew / progressStats.totalCards) * 100 : 0}
            label="New Cards"
            color="bg-gray-400"
          />
        </div>
      </div>

      {/* Study Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Today"
          value={progressStats.studySessionsToday}
          subtitle="Study sessions"
          icon="📅"
        />
        <StatCard
          title="This Week"
          value={progressStats.studySessionsThisWeek}
          subtitle="Study sessions"
          icon="📊"
        />
        <StatCard
          title="This Month"
          value={progressStats.studySessionsThisMonth}
          subtitle="Study sessions"
          icon="📈"
        />
      </div>

      {/* Learning Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Difficulty Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Difficulty Distribution</h3>
          <div className="space-y-4">
            <ProgressBar
              progress={progressStats.totalCards > 0 ? (learningAnalytics.difficultyDistribution.easy / progressStats.totalCards) * 100 : 0}
              label={`Easy (${learningAnalytics.difficultyDistribution.easy})`}
              color="bg-green-500"
            />
            <ProgressBar
              progress={progressStats.totalCards > 0 ? (learningAnalytics.difficultyDistribution.medium / progressStats.totalCards) * 100 : 0}
              label={`Medium (${learningAnalytics.difficultyDistribution.medium})`}
              color="bg-yellow-500"
            />
            <ProgressBar
              progress={progressStats.totalCards > 0 ? (learningAnalytics.difficultyDistribution.hard / progressStats.totalCards) * 100 : 0}
              label={`Hard (${learningAnalytics.difficultyDistribution.hard})`}
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Study Patterns */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Study Patterns</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Most Productive Hour</span>
              <span className="text-sm font-semibold text-blue-600">
                {learningAnalytics.studyPattern.mostProductiveHour}:00
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Most Productive Day</span>
              <span className="text-sm font-semibold text-green-600">
                {learningAnalytics.studyPattern.mostProductiveDay}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Avg Session Length</span>
              <span className="text-sm font-semibold text-purple-600">
                {Math.round(learningAnalytics.studyPattern.averageSessionLength)} min
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Retention Rate</span>
              <span className="text-sm font-semibold text-orange-600">
                {Math.round(learningAnalytics.retentionRate)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </div>

      {/* Study Heatmap */}
      <StudyHeatmap studySessions={studySessions} />

      {/* Deck Progress */}
      {deckProgress.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Deck Progress</h3>
          <div className="space-y-4">
            {deckProgress.map((deck) => (
              <div key={deck.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">{deck.name}</h4>
                  <span className="text-sm text-gray-500">
                    {deck.completedCards}/{deck.totalCards} cards
                  </span>
                </div>
                <ProgressBar
                  progress={deck.progress}
                  label={`${Math.round(deck.progress)}% complete`}
                  color="bg-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Last studied: {deck.lastStudied ? new Date(deck.lastStudied).toLocaleDateString() : 'Never'}</span>
                  <span>Accuracy: {Math.round(deck.averageAccuracy)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;