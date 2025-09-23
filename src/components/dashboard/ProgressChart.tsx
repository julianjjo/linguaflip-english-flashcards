import React from 'react';
import type { StudySession } from '../../types';
import type { DashboardProgress } from '../../stores/dashboard';

interface ProgressChartProps {
  studyHistory: StudySession[];
  dashboardProgress?: DashboardProgress | null;
  loading?: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ studyHistory }) => {
  // Calculate accuracy by difficulty level
  const getAccuracyByDifficulty = () => {
    const accuracyData = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    };

    studyHistory.forEach((session) => {
      // For now, we'll simulate difficulty distribution
      // In a real implementation, this would come from card difficulty data
      const totalCards = session.cardsReviewed;
      const correctCards = session.correctAnswers;

      // Simulate distribution: 40% easy, 40% medium, 20% hard
      const easyCards = Math.floor(totalCards * 0.4);
      const mediumCards = Math.floor(totalCards * 0.4);
      const hardCards = totalCards - easyCards - mediumCards;

      // Simulate higher accuracy for easier cards
      const easyCorrect = Math.floor(correctCards * 0.5);
      const mediumCorrect = Math.floor(correctCards * 0.35);
      const hardCorrect = correctCards - easyCorrect - mediumCorrect;

      accuracyData.easy.correct += easyCorrect;
      accuracyData.easy.total += easyCards;
      accuracyData.medium.correct += mediumCorrect;
      accuracyData.medium.total += mediumCards;
      accuracyData.hard.correct += hardCorrect;
      accuracyData.hard.total += hardCards;
    });

    return {
      easy:
        accuracyData.easy.total > 0
          ? Math.round(
              (accuracyData.easy.correct / accuracyData.easy.total) * 100
            )
          : 0,
      medium:
        accuracyData.medium.total > 0
          ? Math.round(
              (accuracyData.medium.correct / accuracyData.medium.total) * 100
            )
          : 0,
      hard:
        accuracyData.hard.total > 0
          ? Math.round(
              (accuracyData.hard.correct / accuracyData.hard.total) * 100
            )
          : 0,
    };
  };

  const accuracy = getAccuracyByDifficulty();

  const difficultyLevels = [
    {
      label: 'Fácil',
      percentage: accuracy.easy,
      color: 'bg-success-500',
      bgColor: 'bg-success-200',
    },
    {
      label: 'Medio',
      percentage: accuracy.medium,
      color: 'bg-warning-500',
      bgColor: 'bg-warning-200',
    },
    {
      label: 'Difícil',
      percentage: accuracy.hard,
      color: 'bg-error-500',
      bgColor: 'bg-error-200',
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-gray-600 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Precisión por Dificultad
      </h3>

      {studyHistory.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-neutral-500 dark:text-neutral-400">
            <svg
              className="mx-auto mb-4 h-12 w-12 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Comienza a estudiar para ver tus estadísticas de precisión
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {difficultyLevels.map((level, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="min-w-[60px] text-sm text-neutral-600 dark:text-neutral-300">
                {level.label}
              </span>
              <div className="mx-4 flex-1">
                <div className={`w-full ${level.bgColor} h-2 rounded-full`}>
                  <div
                    className={`${level.color} h-2 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${level.percentage}%` }}
                  />
                </div>
              </div>
              <span className="min-w-[45px] text-right text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {level.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}

      {studyHistory.length > 0 && (
        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-gray-600">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <p>Basado en {studyHistory.length} sesiones de estudio</p>
            <p className="mt-1">
              Total de tarjetas revisadas:{' '}
              {studyHistory.reduce(
                (sum, session) => sum + session.cardsReviewed,
                0
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressChart;
