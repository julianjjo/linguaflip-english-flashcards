import React, { useState, useEffect } from 'react';
import { useDataMigration } from '../utils/dataMigration';
import { DataMigrationManager } from '../utils/dataMigration';
import LoadingSpinner from './LoadingSpinner';

interface DataMigrationPromptProps {
  userId?: string;
  onMigrationComplete?: () => void;
  onDismiss?: () => void;
}

const DataMigrationPrompt: React.FC<DataMigrationPromptProps> = ({
  userId,
  onMigrationComplete,
  onDismiss,
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const { migrateData, isMigrating, progress, result } = useDataMigration();

  useEffect(() => {
    const checkForExistingData = async () => {
      if (!userId) {
        setIsAnalyzing(false);
        return;
      }

      try {
        const migrator = new DataMigrationManager();
        const localData = await migrator.analyzeLocalData();

        const hasData =
          localData.flashcards.length > 0 ||
          localData.studySessions.length > 0 ||
          localData.progressStats !== null;

        setHasExistingData(hasData);
        setShowPrompt(hasData && !migrator.isMigrationCompleted());
      } catch (error) {
        console.error('Error checking for existing data:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    checkForExistingData();
  }, [userId]);

  const handleMigrate = async () => {
    if (!userId) return;

    try {
      const migrationResult = await migrateData(userId);
      if (migrationResult.success) {
        setShowPrompt(false);
        onMigrationComplete?.();
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    // Remember user's choice to not show again
    localStorage.setItem('migration_prompt_dismissed', 'true');
  };

  // Don't show if analyzing, no user, no existing data, or already dismissed
  if (isAnalyzing || !userId || !hasExistingData || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🚀 Upgrade to Cloud Sync
          </h2>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <div className="mb-4 text-4xl">☁️</div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              We found your existing data!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Migrate your flashcards and study progress to MongoDB for seamless
              cross-device synchronization.
            </p>
          </div>

          {/* Migration Progress */}
          {isMigrating && progress && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {progress.stage.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {progress.processedItems}/{progress.totalItems}
                </span>
              </div>
              <div className="mb-2 h-2 w-full rounded-full bg-blue-200 dark:bg-blue-700">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
                  style={{
                    width: `${(progress.processedItems / progress.totalItems) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {progress.currentItem}
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span className="mr-2 text-green-500">✓</span>
              Access your data on any device
            </div>
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span className="mr-2 text-green-500">✓</span>
              Automatic backup and sync
            </div>
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span className="mr-2 text-green-500">✓</span>
              Never lose your progress
            </div>
          </div>

          {/* Migration Result */}
          {result && (
            <div
              className={`mb-6 rounded-lg p-4 ${
                result.success
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
              }`}
            >
              <div className="text-sm">
                {result.success ? (
                  <div>
                    <div className="mb-1 font-medium">
                      Migration completed successfully! 🎉
                    </div>
                    <div>
                      Migrated {result.migratedItems.flashcards} flashcards and{' '}
                      {result.migratedItems.studySessions} study sessions
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 font-medium">Migration failed</div>
                    <div>{result.errors.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="flex flex-1 items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isMigrating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Migrating...
                </>
              ) : (
                'Start Migration'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Maybe Later
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Your local data will be preserved during migration
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMigrationPrompt;
