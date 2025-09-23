import React from 'react';
import type { StudySession } from '../types/index';

interface StudyHeatmapProps {
  studySessions: StudySession[];
  months?: number; // Number of months to display (default: 12)
}

const StudyHeatmap: React.FC<StudyHeatmapProps> = ({
  studySessions,
  months = 12,
}) => {
  // Generate date range for the heatmap
  const generateDateRange = (monthsBack: number) => {
    const dates = [];
    const today = new Date();

    for (let i = monthsBack * 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  };

  // Create study data map
  const createStudyDataMap = (sessions: StudySession[]) => {
    const dataMap: { [date: string]: number } = {};

    sessions.forEach((session) => {
      const date = session.date;
      dataMap[date] = (dataMap[date] || 0) + session.totalTime;
    });

    return dataMap;
  };

  // Get intensity level (0-4) based on study time
  const getIntensityLevel = (minutes: number): number => {
    if (minutes === 0) return 0;
    if (minutes < 15) return 1; // Light study
    if (minutes < 30) return 2; // Moderate study
    if (minutes < 60) return 3; // Heavy study
    return 4; // Very heavy study
  };

  // Get color class based on intensity
  const getColorClass = (level: number): string => {
    const colors = [
      'bg-gray-100', // No study
      'bg-green-200', // Light
      'bg-green-300', // Moderate
      'bg-green-400', // Heavy
      'bg-green-500', // Very heavy
    ];
    return colors[level];
  };

  // Get month labels
  const getMonthLabels = () => {
    const monthLabels: string[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthLabels.push(date.toLocaleDateString('en-US', { month: 'short' }));
    }

    return monthLabels;
  };

  // Get day labels
  const getDayLabels = () => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  const dateRange = generateDateRange(months);
  const studyDataMap = createStudyDataMap(studySessions);
  const monthLabels = getMonthLabels();
  const dayLabels = getDayLabels();

  // Group dates by week
  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  dateRange.forEach((date, index) => {
    const dayOfWeek = new Date(date).getDay();
    currentWeek.push(date);

    // If it's Saturday (6) or the last day, complete the week
    if (dayOfWeek === 6 || index === dateRange.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Calculate statistics
  const totalStudyTime = Object.values(studyDataMap).reduce(
    (sum, time) => sum + time,
    0
  );
  const studyDays = Object.keys(studyDataMap).length;
  const averageDailyTime = studyDays > 0 ? totalStudyTime / studyDays : 0;

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Study Consistency
          </h3>
          <p className="text-sm text-gray-600">
            Your study activity over the past {months} months
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {Math.round(totalStudyTime)}m
          </div>
          <div className="text-xs text-gray-500">Total study time</div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-lg font-semibold text-blue-600">{studyDays}</div>
          <div className="text-xs text-gray-600">Study Days</div>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-lg font-semibold text-green-600">
            {Math.round(averageDailyTime)}m
          </div>
          <div className="text-xs text-gray-600">Daily Average</div>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 text-center">
          <div className="text-lg font-semibold text-purple-600">
            {studyDays > 0 ? Math.round((studyDays / (months * 30)) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-600">Consistency</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-flex">
          {/* Day labels */}
          <div className="flex flex-col justify-around pr-2 text-xs text-gray-500">
            {dayLabels.map((day, index) => (
              <div key={day} className="flex h-3 items-center">
                {index % 2 === 0 ? day : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex space-x-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col space-y-1">
                {week.map((date) => {
                  const studyTime = studyDataMap[date] || 0;
                  const intensityLevel = getIntensityLevel(studyTime);
                  const colorClass = getColorClass(intensityLevel);

                  return (
                    <div
                      key={date}
                      className={`h-3 w-3 rounded-sm ${colorClass} cursor-pointer border border-gray-200 transition-all hover:ring-2 hover:ring-blue-300`}
                      title={`${date}: ${studyTime > 0 ? `${studyTime} minutes` : 'No study'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Month labels */}
        <div className="mt-2 flex pl-8">
          {monthLabels.map((month) => (
            <div
              key={month}
              className="text-xs text-gray-500"
              style={{ width: `${100 / monthLabels.length}%` }}
            >
              {month}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600">Less</div>
        <div className="flex space-x-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-3 w-3 rounded-sm ${getColorClass(level)} border border-gray-200`}
              title={
                level === 0
                  ? 'No study'
                  : level === 1
                    ? '< 15 min'
                    : level === 2
                      ? '15-30 min'
                      : level === 3
                        ? '30-60 min'
                        : '> 60 min'
              }
            />
          ))}
        </div>
        <div className="text-sm text-gray-600">More</div>
      </div>

      {/* Insights */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Study Insights
        </h4>
        <div className="space-y-1 text-sm text-gray-600">
          {studyDays === 0 ? (
            <p>Start studying to see your consistency pattern!</p>
          ) : (
            <>
              <p>
                You&apos;ve studied on <strong>{studyDays}</strong> days in the
                past {months} months.
              </p>
              <p>
                Your average daily study time is{' '}
                <strong>{Math.round(averageDailyTime)} minutes</strong>.
              </p>
              <p>
                {averageDailyTime < 15
                  ? 'Consider increasing your daily study time for better retention.'
                  : averageDailyTime > 60
                    ? 'Great job maintaining consistent long study sessions!'
                    : 'Your study time looks balanced and consistent.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyHeatmap;
