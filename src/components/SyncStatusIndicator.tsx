/**
 * Sync Status Indicator Component
 *
 * Displays the current synchronization status and provides manual sync controls.
 * Shows connection status, pending changes, last sync time, and sync progress.
 */

import React, { useState, useEffect } from 'react';
import { useSyncStatus } from '../stores/hybridStorage';
import { hybridStorage } from '../stores/hybridStorage';

interface SyncStatusIndicatorProps {
  userId?: string;
  compact?: boolean;
  showControls?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  userId,
  compact = false,
  showControls = true,
  className = '',
}) => {
  const syncStatus = useSyncStatus();
  const [isManualSync, setIsManualSync] = useState(false);

  // Handle manual sync
  const handleManualSync = async () => {
    if (!userId || syncStatus.syncInProgress) return;

    setIsManualSync(true);
    try {
      await hybridStorage.forceSync(userId);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSync(false);
    }
  };

  // Format last sync time
  const formatLastSyncTime = (timestamp: Date | null): string => {
    if (!timestamp) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return timestamp.toLocaleDateString();
  };

  // Get status color and icon
  const getStatusInfo = () => {
    if (syncStatus.syncInProgress || isManualSync) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: '🔄',
        text: 'Syncing...',
      };
    }

    if (!syncStatus.isOnline) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: '📶',
        text: 'Offline',
      };
    }

    if (syncStatus.lastSyncError) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '❌',
        text: 'Sync Error',
      };
    }

    if (syncStatus.pendingChanges > 0) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: '⏳',
        text: `${syncStatus.pendingChanges} pending`,
      };
    }

    return {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: '✅',
      text: 'Synced',
    };
  };

  const statusInfo = getStatusInfo();

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div
          className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${statusInfo.bgColor} ${statusInfo.color}`}
        >
          <span className="text-sm">{statusInfo.icon}</span>
          <span>{statusInfo.text}</span>
        </div>
        {showControls && syncStatus.isOnline && (
          <button
            onClick={handleManualSync}
            disabled={syncStatus.syncInProgress || isManualSync}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Sync now"
          >
            🔄
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Sync Status</h3>
        <div
          className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs ${statusInfo.bgColor} ${statusInfo.color}`}
        >
          <span>{statusInfo.icon}</span>
          <span>{statusInfo.text}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Connection:</span>
          <span
            className={
              syncStatus.isOnline ? 'text-green-600' : 'text-orange-600'
            }
          >
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Last Sync:</span>
          <span>{formatLastSyncTime(syncStatus.lastSyncTimestamp)}</span>
        </div>

        {syncStatus.pendingChanges > 0 && (
          <div className="flex justify-between">
            <span>Pending Changes:</span>
            <span className="font-medium text-yellow-600">
              {syncStatus.pendingChanges}
            </span>
          </div>
        )}

        {syncStatus.lastSyncError && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <div className="font-medium">Last Error:</div>
            <div className="mt-1">{syncStatus.lastSyncError}</div>
          </div>
        )}
      </div>

      {showControls && (
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleManualSync}
            disabled={
              !syncStatus.isOnline || syncStatus.syncInProgress || isManualSync
            }
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isManualSync ? 'Syncing...' : 'Sync Now'}
          </button>

          {syncStatus.pendingChanges > 0 && (
            <div className="self-center text-xs text-gray-500">
              {syncStatus.pendingChanges} items to sync
            </div>
          )}
        </div>
      )}

      {/* Progress indicator for sync operations */}
      {(syncStatus.syncInProgress || isManualSync) && (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 animate-pulse rounded-full bg-blue-600"
              style={{ width: '100%' }}
            ></div>
          </div>
          <div className="mt-1 text-center text-xs text-gray-500">
            Synchronizing with server...
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MINI SYNC INDICATOR (for headers/toolbars)
// ============================================================================

interface MiniSyncIndicatorProps {
  userId?: string;
  className?: string;
}

export const MiniSyncIndicator: React.FC<MiniSyncIndicatorProps> = ({
  userId,
  className = '',
}) => {
  const syncStatus = useSyncStatus();

  const getMiniStatus = () => {
    // If no userId, show offline/local-only status
    if (!userId) return { icon: '💾', color: 'text-gray-500' };

    if (syncStatus.syncInProgress)
      return { icon: '🔄', color: 'text-blue-500' };
    if (!syncStatus.isOnline) return { icon: '📶', color: 'text-orange-500' };
    if (syncStatus.lastSyncError) return { icon: '⚠️', color: 'text-red-500' };
    if (syncStatus.pendingChanges > 0)
      return { icon: '⏳', color: 'text-yellow-500' };
    return { icon: '✅', color: 'text-green-500' };
  };

  const { icon, color } = getMiniStatus();

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span
        className={`${color} text-sm`}
        title={
          !userId
            ? 'Local storage only'
            : syncStatus.syncInProgress
              ? 'Syncing...'
              : !syncStatus.isOnline
                ? 'Offline'
                : syncStatus.lastSyncError
                  ? 'Sync error'
                  : syncStatus.pendingChanges > 0
                    ? `${syncStatus.pendingChanges} pending changes`
                    : 'Synced'
        }
      >
        {icon}
      </span>
      {syncStatus.pendingChanges > 0 && (
        <span className="rounded bg-yellow-100 px-1 text-xs text-yellow-600">
          {syncStatus.pendingChanges}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// SYNC STATUS HOOK WITH AUTO-REFRESH
// ============================================================================

export const useSyncStatusWithAutoRefresh = (
  userId?: string,
  refreshInterval = 30000
) => {
  const syncStatus = useSyncStatus();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      // Trigger a refresh of sync status
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [userId, refreshInterval]);

  return {
    ...syncStatus,
    lastRefresh,
  };
};

// ============================================================================
// OFFLINE INDICATOR COMPONENT
// ============================================================================

export const OfflineIndicator: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const syncStatus = useSyncStatus();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!syncStatus.isOnline) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus.isOnline]);

  if (syncStatus.isOnline || !showMessage) return null;

  return (
    <div
      className={`fixed right-4 top-4 z-50 rounded-lg border border-orange-300 bg-orange-100 px-4 py-2 text-orange-800 shadow-lg ${className}`}
    >
      <div className="flex items-center space-x-2">
        <span>📶</span>
        <span className="text-sm font-medium">You&apos;re offline</span>
        <button
          onClick={() => setShowMessage(false)}
          className="text-orange-600 hover:text-orange-800"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 text-xs">
        Changes will be synced when you&apos;re back online
      </div>
    </div>
  );
};

// ============================================================================
// SYNC PROGRESS MODAL
// ============================================================================

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const syncStatus = useSyncStatus();
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    error?: string;
    data?: unknown;
  } | null>(null);

  const handleSync = async () => {
    if (!userId) return;

    try {
      const result = await hybridStorage.forceSync(userId);
      setSyncResult({ success: true, data: result });
    } catch (error) {
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sync Progress</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span
              className={
                syncStatus.syncInProgress ? 'text-blue-600' : 'text-green-600'
              }
            >
              {syncStatus.syncInProgress ? 'Syncing...' : 'Ready'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Connection:</span>
            <span
              className={
                syncStatus.isOnline ? 'text-green-600' : 'text-orange-600'
              }
            >
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {syncStatus.pendingChanges > 0 && (
            <div className="flex items-center justify-between">
              <span>Pending Changes:</span>
              <span className="text-yellow-600">
                {syncStatus.pendingChanges}
              </span>
            </div>
          )}

          {syncResult && (
            <div className="mt-4 rounded bg-gray-50 p-3">
              <div className="mb-2 text-sm font-medium">Last Sync Result:</div>
              <pre className="whitespace-pre-wrap text-xs text-gray-600">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSync}
              disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
