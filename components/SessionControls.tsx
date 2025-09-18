import React, { useState, useEffect } from 'react';
import type { StudySessionState, SessionControls as SessionControlsType } from '../types';
import { formatSessionTime, calculateSessionProgress } from '../utils/studySession';

interface SessionControlsProps {
  sessionState: StudySessionState;
  sessionControls: SessionControlsType;
  cardsStudied: number;
  totalCards: number;
  onPause: () => void;
  onResume: () => void;
  onEndSession: () => void;
  onBreakStart: () => void;
  onBreakEnd: () => void;
}

const SessionControls: React.FC<SessionControlsProps> = ({
  sessionState,
  sessionControls,
  cardsStudied,
  totalCards,
  onPause,
  onResume,
  onEndSession,
  onBreakStart,
  onBreakEnd
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle break timer
  useEffect(() => {
    if (breakTimeRemaining > 0) {
      const timer = setInterval(() => {
        setBreakTimeRemaining(prev => {
          if (prev <= 1) {
            onBreakEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [breakTimeRemaining, onBreakEnd]);

  const getSessionDuration = (): number => {
    if (!sessionState.startTime) return 0;

    const endTime = sessionState.isPaused && sessionState.pauseTime
      ? sessionState.pauseTime
      : currentTime;

    return Math.floor((endTime.getTime() - sessionState.startTime.getTime()) / 1000) - sessionState.totalPausedTime;
  };

  const getProgressPercentage = (): number => {
    return calculateSessionProgress(cardsStudied, totalCards);
  };

  const shouldShowBreakButton = (): boolean => {
    if (!sessionControls.enablePauseResume || sessionState.isPaused) return false;

    const sessionDuration = getSessionDuration();
    const breakIntervalSeconds = sessionControls.breakInterval * 60;

    return breakIntervalSeconds > 0 && sessionDuration > 0 && sessionDuration % breakIntervalSeconds < 60;
  };

  const handleBreakStart = () => {
    setBreakTimeRemaining(sessionControls.breakDuration);
    onBreakStart();
  };

  const formatTime = (seconds: number): string => {
    return formatSessionTime(seconds);
  };

  if (!sessionState.isActive) return null;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Session Controls</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${sessionState.isPaused ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <span className="text-sm text-neutral-600">
            {sessionState.isPaused ? 'Paused' : 'Active'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-neutral-600 mb-1">
          <span>Progress</span>
          <span>{cardsStudied} / {totalCards} cards</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">
            {formatTime(getSessionDuration())}
          </div>
          <div className="text-xs text-neutral-600">Session Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-secondary-600">
            {getProgressPercentage()}%
          </div>
          <div className="text-xs text-neutral-600">Complete</div>
        </div>
      </div>

      {/* Break Timer */}
      {breakTimeRemaining > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">Break Time</span>
            <span className="text-lg font-bold text-yellow-800">
              {formatTime(breakTimeRemaining)}
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-3">
        {sessionControls.enablePauseResume && (
          <>
            {sessionState.isPaused ? (
              <button
                onClick={onResume}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Resume Session
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Pause Session
              </button>
            )}
          </>
        )}

        {shouldShowBreakButton() && !sessionState.isPaused && (
          <button
            onClick={handleBreakStart}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Take Break
          </button>
        )}

        <button
          onClick={onEndSession}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          End Session
        </button>
      </div>

      {/* Session Stats */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-neutral-900">{cardsStudied}</div>
            <div className="text-xs text-neutral-600">Cards Done</div>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-900">
              {totalCards > 0 ? Math.round((cardsStudied / totalCards) * 100) : 0}%
            </div>
            <div className="text-xs text-neutral-600">Accuracy</div>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-900">
              {totalCards - cardsStudied}
            </div>
            <div className="text-xs text-neutral-600">Remaining</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionControls;