import React from 'react';

interface StatusMessageProps {
  type: 'loading' | 'error' | 'success' | 'info' | 'warning';
  message: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable StatusMessage component for displaying consistent status information
 *
 * Provides standardized visual feedback for different application states including
 * loading, errors, success messages, warnings, and informational messages.
 * Includes consistent styling, icons, and accessibility features.
 *
 * @param props - Component props
 * @param props.type - Type of status message determining color and icon
 * @param props.message - Text content of the status message
 * @param props.className - Additional CSS classes for customization
 * @param props.showIcon - Whether to display the status icon (default: true)
 * @param props.size - Size variant affecting padding and text size ('sm', 'md', 'lg')
 *
 * @example
 * ```tsx
 * <StatusMessage
 *   type="error"
 *   message="Failed to save changes. Please try again."
 *   size="md"
 * />
 *
 * <StatusMessage
 *   type="loading"
 *   message="Saving your changes..."
 *   showIcon={true}
 * />
 * ```
 */
export const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  message,
  className = '',
  showIcon = true,
  size = 'md',
}) => {
  const getStyles = () => {
    const baseStyles = 'rounded-lg p-4 flex items-center';

    const sizeStyles = {
      sm: 'text-sm p-3',
      md: 'text-base p-4',
      lg: 'text-lg p-5',
    };

    const typeStyles = {
      loading: 'bg-blue-50 border border-blue-200 text-blue-800',
      error: 'bg-red-50 border border-red-200 text-red-800',
      success: 'bg-green-50 border border-green-200 text-green-800',
      info: 'bg-blue-50 border border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    };

    return `${baseStyles} ${sizeStyles[size]} ${typeStyles[type]} ${className}`;
  };

  const getIcon = () => {
    if (!showIcon) return null;

    const iconClasses = 'flex-shrink-0 mr-3';
    const iconSize =
      size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

    switch (type) {
      case 'loading':
        return (
          <svg
            className={`animate-spin ${iconClasses} ${iconSize}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            className={iconClasses + ' ' + iconSize}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'success':
        return (
          <svg
            className={iconClasses + ' ' + iconSize}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg
            className={iconClasses + ' ' + iconSize}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg
            className={iconClasses + ' ' + iconSize}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className={getStyles()}>
      {getIcon()}
      <div className="flex-1">{message}</div>
    </div>
  );
};
