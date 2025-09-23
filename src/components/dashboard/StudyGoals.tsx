import React from 'react';
import type { ProgressStats, StudySession } from '../../types';
import type { DashboardStats } from '../../stores/dashboard';

interface StudyGoalsProps {
  progressStats: ProgressStats;
  studyHistory: StudySession[];
  dashboardStats?: DashboardStats | null;
  loading?: boolean;
}

const StudyGoals: React.FC<StudyGoalsProps> = ({
  progressStats,
  studyHistory,
}) => {
  // Calculate today's progress
  const getTodayProgress = () => {
    const today = new Date().toDateString();
    const todaySessions = studyHistory.filter(
      (session) => new Date(session.date).toDateString() === today
    );

    const cardsToday = todaySessions.reduce(
      (sum, session) => sum + session.cardsReviewed,
      0
    );
    const timeToday = todaySessions.reduce(
      (sum, session) => sum + session.totalTime,
      0
    );

    return { cardsToday, timeToday };
  };

  const { cardsToday, timeToday } = getTodayProgress();

  // Define goals (in a real app, these would be user-configurable)
  const dailyCardGoal = 20;
  const dailyTimeGoal = 45; // minutes

  const cardProgress = Math.min((cardsToday / dailyCardGoal) * 100, 100);
  const timeProgress = Math.min((timeToday / dailyTimeGoal) * 100, 100);

  const CircularProgress: React.FC<{
    percentage: number;
    color: string;
    size?: number;
  }> = ({ percentage, color, size = 48 }) => {
    const radius = (size - 4) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            className="dark:stroke-gray-600"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  };

  const goals = [
    {
      title: 'Tarjetas Diarias',
      current: cardsToday,
      target: dailyCardGoal,
      progress: cardProgress,
      color: '#3b82f6',
      unit: 'tarjetas',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      title: 'Tiempo de Estudio',
      current: timeToday,
      target: dailyTimeGoal,
      progress: timeProgress,
      color: '#10b981',
      unit: 'minutos',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-gray-600 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Metas de Estudio
      </h3>

      <div className="space-y-6">
        {goals.map((goal, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                <div className="text-gray-600 dark:text-gray-400">
                  {goal.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {goal.title}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {goal.current} de {goal.target} {goal.unit}
                </p>
              </div>
            </div>
            <CircularProgress percentage={goal.progress} color={goal.color} />
          </div>
        ))}
      </div>

      {/* Weekly streak info */}
      <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Racha Semanal
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {progressStats.currentStreak} días consecutivos
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-accent-600 dark:text-accent-400">
              {progressStats.currentStreak}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              días
            </div>
          </div>
        </div>
      </div>

      {/* Motivation message */}
      <div className="dark:from-primary-900/20 dark:to-accent-900/20 mt-4 rounded-lg bg-gradient-to-r from-primary-50 to-accent-50 p-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {cardProgress >= 100 && timeProgress >= 100
            ? '¡Excelente! Has cumplido todas tus metas de hoy 🎉'
            : cardProgress >= 100
              ? '¡Meta de tarjetas cumplida! Sigue con el tiempo de estudio 💪'
              : timeProgress >= 100
                ? '¡Meta de tiempo cumplida! Intenta revisar más tarjetas 📚'
                : cardProgress > 50 || timeProgress > 50
                  ? '¡Vas por buen camino! Sigue así 🚀'
                  : '¡Comienza tu sesión de estudio para cumplir tus metas!'}
        </p>
      </div>
    </div>
  );
};

export default StudyGoals;
