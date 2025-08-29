import { useState, useCallback } from 'react';
import type { ToastMessage, ToastType } from '@/components/Toast';

interface UseToastReturn {
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, message?: string, options?: {
    duration?: number;
    persistent?: boolean;
  }) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
  showLoading: (title: string, message?: string) => string;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    options: { duration?: number; persistent?: boolean } = {}
  ): string => {
    const id = generateId();
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: options.duration,
      persistent: options.persistent || false,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration for non-persistent toasts
    if (!newToast.persistent && newToast.duration !== 0) {
      const duration = newToast.duration || 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration + 300); // Add buffer for animation
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string) =>
    showToast('success', title, message), [showToast]);

  const showError = useCallback((title: string, message?: string) =>
    showToast('error', title, message), [showToast]);

  const showWarning = useCallback((title: string, message?: string) =>
    showToast('warning', title, message), [showToast]);

  const showInfo = useCallback((title: string, message?: string) =>
    showToast('info', title, message), [showToast]);

  const showLoading = useCallback((title: string, message?: string) =>
    showToast('loading', title, message, { persistent: true }), [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
  };
};