import React, { useState } from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker.js';

const ServiceWorkerStatus: React.FC = () => {
  const {
    isSupported,
    isRegistered,
    isInstalling,
    isActive,
    updateAvailable,
    isOnline,
    register,
    update,
    skipWaiting,
    getCacheStats,
    clearCache,
  } = useServiceWorker();

  const [cacheStats, setCacheStats] = useState<Record<string, number>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleGetCacheStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearCache();
      setCacheStats({});
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearingCache(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Offline Support Not Available
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Your browser doesn't support Service Workers. Offline functionality will not be available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Offline & Caching</h3>
        <p className="text-sm text-gray-600 mb-6">
          Manage offline support and cached content for better performance.
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Connection Status</h4>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-700">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Service Worker Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Service Worker Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Supported:</span>
            <span className="text-green-600">✓ Yes</span>
          </div>
          <div className="flex justify-between">
            <span>Registered:</span>
            <span className={isRegistered ? 'text-green-600' : 'text-red-600'}>
              {isRegistered ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span className={isActive ? 'text-green-600' : 'text-yellow-600'}>
              {isActive ? '✓ Yes' : '○ Installing'}
            </span>
          </div>
          {isInstalling && (
            <div className="flex justify-between">
              <span>Installing:</span>
              <span className="text-blue-600">⟳ In Progress</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          {!isRegistered && (
            <button
              onClick={register}
              disabled={isInstalling}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInstalling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Installing...
                </>
              ) : (
                'Enable Offline Support'
              )}
            </button>
          )}

          {isRegistered && (
            <button
              onClick={update}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Check for Updates
            </button>
          )}
        </div>
      </div>

      {/* Update Available */}
      {updateAvailable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Update Available
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>A new version is available. Update now for the latest features and improvements.</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={skipWaiting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Management */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Cache Management</h4>

        <div className="space-y-3">
          <button
            onClick={handleGetCacheStats}
            disabled={isLoadingStats}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingStats ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              'View Cache Stats'
            )}
          </button>

          {Object.keys(cacheStats).length > 0 && (
            <div className="bg-white rounded-md p-3 border">
              <h5 className="text-xs font-medium text-gray-900 mb-2">Cache Contents:</h5>
              <div className="space-y-1 text-xs text-gray-600">
                {Object.entries(cacheStats).map(([cacheName, count]) => (
                  <div key={cacheName} className="flex justify-between">
                    <span>{cacheName}:</span>
                    <span>{count} items</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearingCache ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Clearing...
              </>
            ) : (
              'Clear All Cache'
            )}
          </button>
        </div>
      </div>

      {/* Offline Benefits */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Offline Benefits
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Faster loading of previously visited pages</li>
                <li>Access to cached flashcards and images</li>
                <li>Basic functionality works without internet</li>
                <li>Reduced data usage for repeated visits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceWorkerStatus;