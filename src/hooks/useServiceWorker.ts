import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  updateAvailable: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  getCacheStats: () => Promise<Record<string, number>>;
  clearCache: () => Promise<void>;
}

export const useServiceWorker = (): UseServiceWorkerReturn => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    updateAvailable: false,
    isOnline: navigator.onLine,
    registration: null,
  });

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      console.warn('Service Worker not supported in this browser');
      return;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service Worker registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setState(prev => ({
                ...prev,
                updateAvailable: true,
                isWaiting: true,
              }));
            }
          });
        }
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service Worker controller changed');
        window.location.reload();
      });

      setState(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
        isActive: !!registration.active,
        registration,
      }));

    } catch (error) {
      console.error('[SW] Registration failed:', error);
      setState(prev => ({
        ...prev,
        isInstalling: false,
        isRegistered: false,
      }));
    }
  }, [state.isSupported]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      const result = await state.registration.unregister();
      console.log('[SW] Service Worker unregistered:', result);

      setState(prev => ({
        ...prev,
        isRegistered: false,
        isActive: false,
        registration: null,
        updateAvailable: false,
        isWaiting: false,
      }));
    } catch (error) {
      console.error('[SW] Unregistration failed:', error);
    }
  }, [state.registration]);

  // Update service worker
  const update = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      console.log('[SW] Service Worker update triggered');
    } catch (error) {
      console.error('[SW] Update failed:', error);
    }
  }, [state.registration]);

  // Skip waiting (activate new version)
  const skipWaiting = useCallback(async () => {
    if (!state.registration?.waiting) return;

    try {
      // Send message to waiting worker
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      setState(prev => ({
        ...prev,
        updateAvailable: false,
        isWaiting: false,
      }));
    } catch (error) {
      console.error('[SW] Skip waiting failed:', error);
    }
  }, [state.registration]);

  // Get cache statistics
  const getCacheStats = useCallback(async (): Promise<Record<string, number>> => {
    if (!state.registration?.active) {
      return {};
    }

    return new Promise<Record<string, number>>((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATS') {
          resolve(event.data.stats);
        }
      };

      state.registration!.active!.postMessage(
        { type: 'GET_CACHE_STATS' },
        [messageChannel.port2]
      );

      // Timeout fallback
      setTimeout(() => resolve({}), 5000);
    });
  }, [state.registration]);

  // Clear all caches
  const clearCache = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) return;

    return new Promise<void>((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };

      state.registration!.active!.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );

      // Timeout fallback
      setTimeout(() => resolve(), 5000);
    });
  }, [state.registration]);

  // Auto-register on mount if supported
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      register();
    }
  }, [state.isSupported, state.isRegistered, register]);

  // Check for existing registration
  useEffect(() => {
    if (state.isSupported) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setState(prev => ({
            ...prev,
            isRegistered: true,
            isActive: !!registration.active,
            registration,
          }));
        }
      });
    }
  }, [state.isSupported]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    getCacheStats,
    clearCache,
  };
};