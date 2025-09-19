import React, { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-close for non-persistent toasts
    if (!toast.persistent && toast.duration !== 0) {
      const duration = toast.duration || 4000;
      let startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
        setProgress(remaining);

        if (remaining > 0) {
          requestAnimationFrame(updateProgress);
        } else {
          handleClose();
        }
      };

      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      requestAnimationFrame(updateProgress);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, toast.persistent, handleClose]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300); // Wait for exit animation
  }, [onClose, toast.id]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'loading':
        return '⏳';
      default:
        return '📢';
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          progress: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          progress: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          progress: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          progress: 'bg-blue-500'
        };
      case 'loading':
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          progress: 'bg-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          progress: 'bg-gray-500'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`
        relative max-w-sm w-full shadow-lg rounded-lg border backdrop-blur-sm
        transition-all duration-300 ease-in-out transform
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        ${colors.bg} ${colors.border}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Progress bar for auto-closing toasts */}
      {!toast.persistent && toast.duration !== 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
          <div
            className={`h-full ${colors.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 text-xl" aria-hidden="true">
            {toast.type === 'loading' ? (
              <div className="animate-spin">{getIcon()}</div>
            ) : (
              getIcon()
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${colors.text} truncate`}>
              {toast.title}
            </h4>
            {toast.message && (
              <p className={`text-sm mt-1 ${colors.text} opacity-90`}>
                {toast.message}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={`
              flex-shrink-0 p-1 rounded-md transition-colors duration-200
              hover:bg-black/10 dark:hover:bg-white/10
              ${colors.text} opacity-70 hover:opacity-100
            `}
            aria-label="Cerrar notificación"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;