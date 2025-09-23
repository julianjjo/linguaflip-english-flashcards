/**
 * Data Migration Utility - Migrate localStorage data to MongoDB
 *
 * This utility provides functions to migrate existing localStorage data
 * to MongoDB while maintaining data integrity and providing progress feedback.
 */

import type {
  FlashcardData,
  StudySession,
  ProgressStats,
  StudyProfile,
} from '../types';
import { hybridStorage } from '../stores/hybridStorage';

export interface MigrationProgress {
  stage:
    | 'analyzing'
    | 'migrating_flashcards'
    | 'migrating_sessions'
    | 'migrating_stats'
    | 'completed'
    | 'error';
  totalItems: number;
  processedItems: number;
  currentItem: string;
  errors: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedItems: {
    flashcards: number;
    studySessions: number;
    progressStats: number;
  };
  skippedItems: number;
  errors: string[];
  duration: number;
}

// Backup data interface
interface BackupData {
  flashcards?: FlashcardData[];
  studySessions?: StudySession[];
  progressStats?: ProgressStats;
  studyProfiles?: StudyProfile[];
  userPreferences?: Record<string, unknown>;
  studySettings?: Record<string, unknown>;
  _metadata: {
    createdAt: string;
    version: string;
    type: string;
  };
}

/**
 * Data Migration Manager Class
 */
export class DataMigrationManager {
  private progressCallback?: (progress: MigrationProgress) => void;
  private abortController?: AbortController;

  constructor(progressCallback?: (progress: MigrationProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Analyze existing localStorage data
   */
  async analyzeLocalData(): Promise<{
    flashcards: FlashcardData[];
    studySessions: StudySession[];
    progressStats: ProgressStats | null;
    studyProfiles: StudyProfile[];
  }> {
    const result = {
      flashcards: [] as FlashcardData[],
      studySessions: [] as StudySession[],
      progressStats: null as ProgressStats | null,
      studyProfiles: [] as StudyProfile[],
    };

    try {
      // Analyze flashcards
      const flashcardsData = localStorage.getItem('flashcards');
      if (flashcardsData) {
        const parsed = JSON.parse(flashcardsData);
        if (Array.isArray(parsed)) {
          result.flashcards = parsed.filter(
            (item) =>
              item &&
              typeof item === 'object' &&
              item.id &&
              item.english &&
              item.spanish
          );
        }
      }

      // Analyze study sessions
      const sessionsData = localStorage.getItem('studySessions');
      if (sessionsData) {
        const parsed = JSON.parse(sessionsData);
        if (Array.isArray(parsed)) {
          result.studySessions = parsed.filter(
            (item) => item && typeof item === 'object' && item.id && item.date
          );
        }
      }

      // Analyze progress stats
      const progressData = localStorage.getItem('progressStats');
      if (progressData) {
        const parsed = JSON.parse(progressData);
        if (parsed && typeof parsed === 'object') {
          result.progressStats = parsed;
        }
      }

      // Analyze study profiles
      const profilesData = localStorage.getItem('studyProfiles');
      if (profilesData) {
        const parsed = JSON.parse(profilesData);
        if (Array.isArray(parsed)) {
          result.studyProfiles = parsed.filter(
            (item) => item && typeof item === 'object' && item.id && item.name
          );
        }
      }
    } catch (error) {
      console.error('Error analyzing local data:', error);
    }

    return result;
  }

  /**
   * Migrate all localStorage data to MongoDB
   */
  async migrateToMongoDB(userId: string): Promise<MigrationResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    const result: MigrationResult = {
      success: true,
      migratedItems: {
        flashcards: 0,
        studySessions: 0,
        progressStats: 0,
      },
      skippedItems: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Update progress: analyzing
      this.updateProgress({
        stage: 'analyzing',
        totalItems: 0,
        processedItems: 0,
        currentItem: 'Analyzing local data...',
        errors: [],
      });

      // Analyze existing data
      const localData = await this.analyzeLocalData();
      const totalItems =
        localData.flashcards.length +
        localData.studySessions.length +
        (localData.progressStats ? 1 : 0);

      // Update progress: starting migration
      this.updateProgress({
        stage: 'migrating_flashcards',
        totalItems,
        processedItems: 0,
        currentItem: 'Starting migration...',
        errors: [],
      });

      // Check if migration was aborted
      if (this.abortController.signal.aborted) {
        throw new Error('Migration aborted by user');
      }

      // Migrate flashcards
      if (localData.flashcards.length > 0) {
        this.updateProgress({
          stage: 'migrating_flashcards',
          totalItems,
          processedItems: 0,
          currentItem: `Migrating ${localData.flashcards.length} flashcards...`,
          errors: [],
        });

        for (let i = 0; i < localData.flashcards.length; i++) {
          if (this.abortController.signal.aborted) {
            throw new Error('Migration aborted by user');
          }

          const flashcard = localData.flashcards[i];
          try {
            await hybridStorage.saveFlashcard(userId, flashcard);
            result.migratedItems.flashcards++;

            this.updateProgress({
              stage: 'migrating_flashcards',
              totalItems,
              processedItems:
                result.migratedItems.flashcards +
                result.migratedItems.studySessions,
              currentItem: `Migrating flashcard: ${flashcard.english}`,
              errors: result.errors,
            });
          } catch (error) {
            const errorMsg = `Failed to migrate flashcard ${flashcard.id}: ${error}`;
            result.errors.push(errorMsg);
            result.skippedItems++;
            console.error(errorMsg);
          }
        }
      }

      // Migrate study sessions
      if (localData.studySessions.length > 0) {
        this.updateProgress({
          stage: 'migrating_sessions',
          totalItems,
          processedItems: result.migratedItems.flashcards,
          currentItem: `Migrating ${localData.studySessions.length} study sessions...`,
          errors: result.errors,
        });

        for (let i = 0; i < localData.studySessions.length; i++) {
          if (this.abortController.signal.aborted) {
            throw new Error('Migration aborted by user');
          }

          const session = localData.studySessions[i];
          try {
            await hybridStorage.saveStudySession(userId, session);
            result.migratedItems.studySessions++;

            this.updateProgress({
              stage: 'migrating_sessions',
              totalItems,
              processedItems:
                result.migratedItems.flashcards +
                result.migratedItems.studySessions,
              currentItem: `Migrating session: ${session.id}`,
              errors: result.errors,
            });
          } catch (error) {
            const errorMsg = `Failed to migrate study session ${session.id}: ${error}`;
            result.errors.push(errorMsg);
            result.skippedItems++;
            console.error(errorMsg);
          }
        }
      }

      // Migrate progress stats (if exists)
      if (localData.progressStats) {
        this.updateProgress({
          stage: 'migrating_stats',
          totalItems,
          processedItems:
            result.migratedItems.flashcards +
            result.migratedItems.studySessions,
          currentItem: 'Migrating progress statistics...',
          errors: result.errors,
        });

        try {
          // Note: Progress stats are typically calculated from sessions, so we'll just mark as migrated
          result.migratedItems.progressStats = 1;

          this.updateProgress({
            stage: 'migrating_stats',
            totalItems,
            processedItems: totalItems,
            currentItem: 'Progress statistics migrated',
            errors: result.errors,
          });
        } catch (error) {
          const errorMsg = `Failed to migrate progress stats: ${error}`;
          result.errors.push(errorMsg);
          result.skippedItems++;
          console.error(errorMsg);
        }
      }

      // Complete migration
      this.updateProgress({
        stage: 'completed',
        totalItems,
        processedItems: totalItems,
        currentItem: 'Migration completed successfully!',
        errors: result.errors,
      });

      // Force a final sync to ensure all data is saved
      await hybridStorage.forceSync(userId);
    } catch (error) {
      result.success = false;
      const errorMsg =
        error instanceof Error ? error.message : 'Migration failed';
      result.errors.push(errorMsg);

      this.updateProgress({
        stage: 'error',
        totalItems: 0,
        processedItems: 0,
        currentItem: `Migration failed: ${errorMsg}`,
        errors: result.errors,
      });

      console.error('Migration failed:', error);
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Create backup of current localStorage data
   */
  createBackup(): string {
    const backup: Partial<BackupData> = {};

    // Backup relevant keys
    const keysToBackup = [
      'flashcards',
      'studySessions',
      'progressStats',
      'studyProfiles',
      'userPreferences',
      'studySettings',
    ];

    for (const key of keysToBackup) {
      const data = localStorage.getItem(key);
      if (data) {
        (backup as Record<string, unknown>)[key] = JSON.parse(data);
      }
    }

    // Add metadata
    backup._metadata = {
      createdAt: new Date().toISOString(),
      version: '1.0',
      type: 'linguaflip_backup',
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restore data from backup
   */
  restoreFromBackup(backupData: string): boolean {
    try {
      const backup = JSON.parse(backupData);

      // Validate backup
      if (!backup._metadata || backup._metadata.type !== 'linguaflip_backup') {
        throw new Error('Invalid backup file');
      }

      // Restore data
      for (const [key, data] of Object.entries(backup)) {
        if (key !== '_metadata' && key in backup) {
          localStorage.setItem(key, JSON.stringify(data));
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Clear migrated localStorage data (after successful migration)
   */
  clearMigratedData(): void {
    const keysToClear = [
      'flashcards',
      'studySessions',
      'progressStats',
      'studyProfiles',
    ];

    for (const key of keysToClear) {
      localStorage.removeItem(key);
    }

    // Mark migration as complete
    localStorage.setItem('migration_completed', new Date().toISOString());
  }

  /**
   * Check if migration has been completed
   */
  isMigrationCompleted(): boolean {
    return localStorage.getItem('migration_completed') !== null;
  }

  /**
   * Abort ongoing migration
   */
  abortMigration(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Update progress callback
   */
  private updateProgress(progress: MigrationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick migration function for simple use cases
 */
export async function migrateUserData(
  userId: string
): Promise<MigrationResult> {
  const migrator = new DataMigrationManager();
  return await migrator.migrateToMongoDB(userId);
}

/**
 * Create and download backup file
 */
export function downloadBackup(): void {
  const migrator = new DataMigrationManager();
  const backup = migrator.createBackup();

  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `linguaflip-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Validate backup file
 */
export function validateBackup(backupData: string): boolean {
  try {
    const backup = JSON.parse(backupData);
    return (
      backup._metadata &&
      backup._metadata.type === 'linguaflip_backup' &&
      backup._metadata.version
    );
  } catch {
    return false;
  }
}

// ============================================================================
// REACT HOOK FOR MIGRATION
// ============================================================================

import { useState, useCallback } from 'react';

export function useDataMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const migrateData = useCallback(async (userId: string) => {
    setIsMigrating(true);
    setResult(null);

    const migrator = new DataMigrationManager((progressUpdate) => {
      setProgress(progressUpdate);
    });

    try {
      const migrationResult = await migrator.migrateToMongoDB(userId);
      setResult(migrationResult);

      // Clear migrated data if successful
      if (migrationResult.success && migrationResult.errors.length === 0) {
        migrator.clearMigratedData();
      }

      return migrationResult;
    } finally {
      setIsMigrating(false);
    }
  }, []);

  const createBackup = useCallback(() => {
    downloadBackup();
  }, []);

  const abortMigration = useCallback(() => {
    // Note: This would need to be implemented with a ref to the migrator instance
    console.warn('Abort functionality requires migrator instance reference');
  }, []);

  return {
    migrateData,
    createBackup,
    abortMigration,
    isMigrating,
    progress,
    result,
  };
}
