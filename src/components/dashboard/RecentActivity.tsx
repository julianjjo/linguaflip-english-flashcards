import React from 'react';
import type { StudySession } from '../../types';
import type { DashboardActivity } from '../../stores/dashboard';

interface RecentActivityProps {
  studyHistory: StudySession[];
  dashboardActivity?: DashboardActivity | null;
  loading?: boolean;
  maxItems?: number;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  studyHistory, 
  maxItems = 5 
}) => {
  // Sort sessions by date (most recent first) and limit
  const recentSessions = studyHistory
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-success-600 dark:text-success-400';
    if (accuracy >= 60) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Actividad Reciente
      </h3>
      
      {recentSessions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-neutral-500 dark:text-neutral-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No hay sesiones de estudio recientes
          </p>
          <a
            href="/study"
            className="inline-flex items-center mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Comenzar a Estudiar
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {recentSessions.map((session, index) => {
              const accuracy = Math.round((session.correctAnswers / session.cardsReviewed) * 100);
              
              return (
                <div key={session.id || index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {session.cardsReviewed} tarjetas estudiadas
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        {formatDate(session.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {session.totalTime}m
                    </p>
                    <p className={`text-xs ${getAccuracyColor(accuracy)}`}>
                      {accuracy}% precisión
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-gray-600">
            <a
              href="/study"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm flex items-center gap-2"
            >
              Ver todas las sesiones
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default RecentActivity;