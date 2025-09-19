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
  className = ''
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
        text: 'Syncing...'
      };
    }

    if (!syncStatus.isOnline) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: '📶',
        text: 'Offline'
      };
    }

    if (syncStatus.lastSyncError) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '❌',
        text: 'Sync Error'
      };
    }

    if (syncStatus.pendingChanges > 0) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: '⏳',
        text: `${syncStatus.pendingChanges} pending`
      };
    }

    return {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: '✅',
      text: 'Synced'
    };
  };

  const statusInfo = getStatusInfo();

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.color}`}>
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
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Sync Status</h3>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.color}`}>
          <span>{statusInfo.icon}</span>
          <span>{statusInfo.text}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Connection:</span>
          <span className={syncStatus.isOnline ? 'text-green-600' : 'text-orange-600'}>
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
            <span className="text-yellow-600 font-medium">{syncStatus.pendingChanges}</span>
          </div>
        )}

        {syncStatus.lastSyncError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <div className="font-medium">Last Error:</div>
            <div className="mt-1">{syncStatus.lastSyncError}</div>
          </div>
        )}
      </div>

      {showControls && (
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleManualSync}
            disabled={!syncStatus.isOnline || syncStatus.syncInProgress || isManualSync}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isManualSync ? 'Syncing...' : 'Sync Now'}
          </button>

          {syncStatus.pendingChanges > 0 && (
            <div className="text-xs text-gray-500 self-center">
              {syncStatus.pendingChanges} items to sync
            </div>
          )}
        </div>
      )}

      {/* Progress indicator for sync operations */}
      {(syncStatus.syncInProgress || isManualSync) && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
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
  className = ''
}) => {
  const syncStatus = useSyncStatus();

  const getMiniStatus = () => {
    // If no userId, show offline/local-only status
    if (!userId) return { icon: '💾', color: 'text-gray-500' };
    
    if (syncStatus.syncInProgress) return { icon: '🔄', color: 'text-blue-500' };
    if (!syncStatus.isOnline) return { icon: '📶', color: 'text-orange-500' };
    if (syncStatus.lastSyncError) return { icon: '⚠️', color: 'text-red-500' };
    if (syncStatus.pendingChanges > 0) return { icon: '⏳', color: 'text-yellow-500' };
    return { icon: '✅', color: 'text-green-500' };
  };

  const { icon, color } = getMiniStatus();

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className={`${color} text-sm`} title={
        !userId ? 'Local storage only' :
        syncStatus.syncInProgress ? 'Syncing...' :
        !syncStatus.isOnline ? 'Offline' :
        syncStatus.lastSyncError ? 'Sync error' :
        syncStatus.pendingChanges > 0 ? `${syncStatus.pendingChanges} pending changes` :
        'Synced'
      }>
        {icon}
      </span>
      {syncStatus.pendingChanges > 0 && (
        <span className="text-xs text-yellow-600 bg-yellow-100 px-1 rounded">
          {syncStatus.pendingChanges}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// SYNC STATUS HOOK WITH AUTO-REFRESH
// ============================================================================

export const useSyncStatusWithAutoRefresh = (userId?: string, refreshInterval = 30000) => {
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
    lastRefresh
  };
};

// ============================================================================
// OFFLINE INDICATOR COMPONENT
// ============================================================================

export const OfflineIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
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
    <div className={`fixed top-4 right-4 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
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
      <div className="text-xs mt-1">
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
  userId
}) => {
  const syncStatus = useSyncStatus();
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleSync = async () => {
    if (!userId) return;

    try {
      const result = await hybridStorage.forceSync(userId);
      setSyncResult(result);
    } catch (error) {
      setSyncResult({ error: error instanceof Error ? error.message : 'Sync failed' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
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
            <span className={syncStatus.syncInProgress ? 'text-blue-600' : 'text-green-600'}>
              {syncStatus.syncInProgress ? 'Syncing...' : 'Ready'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Connection:</span>
            <span className={syncStatus.isOnline ? 'text-green-600' : 'text-orange-600'}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {syncStatus.pendingChanges > 0 && (
            <div className="flex items-center justify-between">
              <span>Pending Changes:</span>
              <span className="text-yellow-600">{syncStatus.pendingChanges}</span>
            </div>
          )}

          {syncResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium mb-2">Last Sync Result:</div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSync}
              disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};