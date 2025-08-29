import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
  label?: string;
  indeterminate?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  color = 'primary',
  showPercentage = false,
  animated = true,
  className = '',
  label,
  indeterminate = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'md':
        return 'h-2';
      case 'lg':
        return 'h-3';
      default:
        return 'h-2';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return {
          bg: 'bg-primary-500',
          track: 'bg-primary-100 dark:bg-primary-900/30'
        };
      case 'secondary':
        return {
          bg: 'bg-secondary-500',
          track: 'bg-secondary-100 dark:bg-secondary-900/30'
        };
      case 'success':
        return {
          bg: 'bg-green-500',
          track: 'bg-green-100 dark:bg-green-900/30'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          track: 'bg-yellow-100 dark:bg-yellow-900/30'
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          track: 'bg-red-100 dark:bg-red-900/30'
        };
      default:
        return {
          bg: 'bg-primary-500',
          track: 'bg-primary-100 dark:bg-primary-900/30'
        };
    }
  };

  const colors = getColorClasses();
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {indeterminate ? 'Procesando...' : `${Math.round(clampedProgress)}%`}
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={`w-full ${getSizeClasses()} ${colors.track} rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progreso'}
      >
        {/* Progress fill */}
        <div
          className={`
            h-full ${colors.bg} rounded-full transition-all duration-300 ease-out
            ${animated ? 'transition-all duration-300 ease-out' : ''}
            ${indeterminate ? 'animate-pulse' : ''}
          `}
          style={{
            width: indeterminate ? '100%' : `${clampedProgress}%`,
            transform: indeterminate ? 'translateX(-100%)' : 'none',
            animation: indeterminate ? 'shimmer 1.5s ease-in-out infinite' : undefined
          }}
        />

        {/* Shimmer effect for indeterminate */}
        {indeterminate && (
          <div className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;