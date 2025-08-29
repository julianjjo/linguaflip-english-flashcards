/**
 * Data Synchronization Service - Offline/Online Sync for LinguaFlip
 *
 * This service handles data synchronization between local storage and MongoDB,
 * including conflict resolution, data migration, and offline support.
 */

import { createDatabaseOperations } from '../utils/databaseOperations';
import type {
  UserDocument,
  FlashcardDocument,
  StudySessionDocument,
  StudyStatisticsDocument,
  DatabaseOperationResult
} from '../types/database';
import {
  DatabaseError,
  ValidationError,
  safeAsync,
  errorHandler
} from '../types/database';

// Import individual services
import { usersService } from './users';
import { flashcardsService } from './flashcards';
import { studySessionsService } from './studySessions';
import { studyStatisticsService } from './studyStatistics';
import { bulkOperationsService } from './bulkOperations';

/**
 * Sync Conflict Types
 */
export interface SyncConflict {
  collection: string;
  documentId: string;
  localVersion: any;
  remoteVersion: any;
  conflictType: 'create' | 'update' | 'delete';
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
  timestamp: Date;
}

/**
 * Sync Session Metadata
 */
export interface SyncSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'failed';
  totalItems: number;
  syncedItems: number;
  conflicts: SyncConflict[];
  errors: string[];
}

/**
 * Data Synchronization Service Class
 */
export class SyncService {
  private activeSyncSessions = new Map<string, SyncSession>();

  /**
   * Start a new sync session
   */
  async startSyncSession(userId: string): Promise<DatabaseOperationResult<SyncSession>> {
    return safeAsync(async () => {
      const sessionId = `sync_${userId}_${Date.now()}`;
      const syncSession: SyncSession = {
        sessionId,
        userId,
        startTime: new Date(),
        status: 'in_progress',
        totalItems: 0,
        syncedItems: 0,
        conflicts: [],
        errors: []
      };

      this.activeSyncSessions.set(sessionId, syncSession);

      return {
        success: true,
        data: syncSession,
        operationTime: Date.now()
      };
    }, { operation: 'start_sync_session', userId });
  }

  /**
   * Sync user data from local storage to MongoDB
   */
  async syncFromLocal(
    userId: string,
    localData: {
      flashcards?: FlashcardDocument[];
      studySessions?: StudySessionDocument[];
      studyStatistics?: StudyStatisticsDocument[];
      lastSyncTimestamp?: Date;
    },
    options: {
      resolveConflicts?: 'local' | 'remote' | 'merge';
      skipExisting?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<DatabaseOperationResult<SyncSession>> {
    return safeAsync(async () => {
      // Start sync session
      const sessionResult = await this.startSyncSession(userId);
      if (!sessionResult.success || !sessionResult.data) {
        throw new DatabaseError('Failed to start sync session', 'SYNC_FAILED', 'sync_from_local');
      }

      const syncSession = sessionResult.data;
      const { resolveConflicts = 'merge', skipExisting = false, batchSize = 50 } = options;

      try {
        // Calculate total items
        syncSession.totalItems =
          (localData.flashcards?.length || 0) +
          (localData.studySessions?.length || 0) +
          (localData.studyStatistics?.length || 0);

        // Sync flashcards
        if (localData.flashcards && localData.flashcards.length > 0) {
          await this.syncFlashcards(syncSession, localData.flashcards, {
            resolveConflicts,
            skipExisting,
            batchSize
          });
        }

        // Sync study sessions
        if (localData.studySessions && localData.studySessions.length > 0) {
          await this.syncStudySessions(syncSession, localData.studySessions, {
            resolveConflicts,
            skipExisting,
            batchSize
          });
        }

        // Sync study statistics
        if (localData.studyStatistics && localData.studyStatistics.length > 0) {
          await this.syncStudyStatistics(syncSession, localData.studyStatistics, {
            resolveConflicts,
            skipExisting,
            batchSize
          });
        }

        // Complete sync session
        syncSession.endTime = new Date();
        syncSession.status = syncSession.conflicts.length > 0 ? 'completed' : 'completed';

        this.activeSyncSessions.set(syncSession.sessionId, syncSession);

        return {
          success: true,
          data: syncSession,
          operationTime: Date.now()
        };

      } catch (error) {
        syncSession.status = 'failed';
        syncSession.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
        syncSession.endTime = new Date();

        throw error;
      }
    }, { operation: 'sync_from_local', userId });
  }

  /**
   * Sync user data from MongoDB to local storage
   */
  async syncToLocal(
    userId: string,
    options: {
      since?: Date;
      includeFlashcards?: boolean;
      includeSessions?: boolean;
      includeStatistics?: boolean;
      limit?: number;
    } = {}
  ): Promise<DatabaseOperationResult<any>> {
    return safeAsync(async () => {
      const {
        since,
        includeFlashcards = true,
        includeSessions = true,
        includeStatistics = true,
        limit = 1000
      } = options;

      const syncData: any = {
        userId,
        syncedAt: new Date(),
        data: {}
      };

      // Sync flashcards
      if (includeFlashcards) {
        const flashcardsResult = await flashcardsService.getDueFlashcards(userId, {
          limit,
          includeSuspended: true
        });

        if (flashcardsResult.success && flashcardsResult.data) {
          syncData.data.flashcards = flashcardsResult.data;
        }
      }

      // Sync study sessions
      if (includeSessions) {
        const sessionsResult = await studySessionsService.getUserStudySessions(userId, {
          limit,
          dateRange: since ? { start: since, end: new Date() } : undefined
        });

        if (sessionsResult.success && sessionsResult.data) {
          syncData.data.studySessions = sessionsResult.data;
        }
      }

      // Sync study statistics
      if (includeStatistics) {
        const statsResult = await studyStatisticsService.getStudyStatisticsRange(
          userId,
          since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date(),
          'daily',
          { limit }
        );

        if (statsResult.success && statsResult.data) {
          syncData.data.studyStatistics = statsResult.data;
        }
      }

      return {
        success: true,
        data: syncData,
        operationTime: Date.now()
      };
    }, { operation: 'sync_to_local', userId });
  }

  /**
   * Resolve sync conflicts
   */
  async resolveConflicts(
    sessionId: string,
    resolutions: Array<{
      conflictIndex: number;
      resolution: 'local' | 'remote' | 'merge' | 'manual';
      mergedData?: any;
    }>
  ): Promise<DatabaseOperationResult<SyncSession>> {
    return safeAsync(async () => {
      const syncSession = this.activeSyncSessions.get(sessionId);
      if (!syncSession) {
        throw new ValidationError('Sync session not found', 'resolve_conflicts');
      }

      for (const resolution of resolutions) {
        const conflict = syncSession.conflicts[resolution.conflictIndex];
        if (!conflict) continue;

        conflict.resolved = true;
        conflict.resolution = resolution.resolution;

        // Apply resolution
        await this.applyConflictResolution(conflict, resolution);
      }

      return {
        success: true,
        data: syncSession,
        operationTime: Date.now()
      };
    }, { operation: 'resolve_conflicts' });
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(userId: string): Promise<DatabaseOperationResult<any>> {
    return safeAsync(async () => {
      // Get last sync timestamp from user data
      const userResult = await usersService.getUserById(userId);
      const lastSyncTimestamp = userResult.success && userResult.data?.updatedAt ? userResult.data.updatedAt : undefined;

      // Count pending items (items modified since last sync)
      const pendingCounts = await this.getPendingSyncCounts(userId, lastSyncTimestamp);

      return {
        success: true,
        data: {
          userId,
          lastSyncTimestamp,
          pendingItems: pendingCounts,
          activeSyncSessions: Array.from(this.activeSyncSessions.values())
            .filter(session => session.userId === userId)
        },
        operationTime: Date.now()
      };
    }, { operation: 'get_sync_status', userId });
  }

  /**
   * Perform full data migration for a user
   */
  async migrateUserData(
    userId: string,
    sourceData: {
      flashcards?: any[];
      studySessions?: any[];
      studyStatistics?: any[];
    },
    options: {
      validateData?: boolean;
      transformData?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<DatabaseOperationResult<any>> {
    return safeAsync(async () => {
      const { validateData = true, transformData = true, batchSize = 100 } = options;

      const migrationResult = {
        success: true,
        migratedItems: {
          flashcards: 0,
          studySessions: 0,
          studyStatistics: 0
        },
        errors: [] as string[],
        skippedItems: 0
      };

      // Transform and validate data if requested
      let processedData = sourceData;

      if (transformData) {
        processedData = await this.transformMigrationData(sourceData, userId);
      }

      if (validateData) {
        const validationResult = await this.validateMigrationData(processedData);
        if (!validationResult.isValid) {
          migrationResult.errors.push(...validationResult.errors);
          if (validationResult.errors.length > 0) {
            migrationResult.success = false;
            return { success: false, data: migrationResult, operationTime: Date.now() };
          }
        }
      }

      // Import flashcards
      if (processedData.flashcards && processedData.flashcards.length > 0) {
        const flashcardsResult = await bulkOperationsService.bulkImportFlashcards(
          userId,
          processedData.flashcards,
          { skipDuplicates: true, batchSize }
        );

        if (flashcardsResult.success && flashcardsResult.data) {
          migrationResult.migratedItems.flashcards = flashcardsResult.data.insertedCount;
          if (flashcardsResult.data.errors.length > 0) {
            migrationResult.errors.push(...flashcardsResult.data.errors);
          }
        }
      }

      // Import study sessions
      if (processedData.studySessions && processedData.studySessions.length > 0) {
        const sessionsResult = await bulkOperationsService.bulkCreateStudySessions(
          userId,
          processedData.studySessions
        );

        if (sessionsResult.success && sessionsResult.data) {
          migrationResult.migratedItems.studySessions = sessionsResult.data.insertedCount;
          if (sessionsResult.data.errors.length > 0) {
            migrationResult.errors.push(...sessionsResult.data.errors);
          }
        }
      }

      // Import study statistics
      if (processedData.studyStatistics && processedData.studyStatistics.length > 0) {
        for (const stats of processedData.studyStatistics) {
          try {
            await studyStatisticsService.createStudyStatistics(stats, userId);
            migrationResult.migratedItems.studyStatistics++;
          } catch (error) {
            migrationResult.errors.push(`Failed to migrate study statistics: ${error}`);
          }
        }
      }

      return {
        success: migrationResult.success,
        data: migrationResult,
        operationTime: Date.now()
      };
    }, { operation: 'migrate_user_data', userId });
  }

  /**
   * Clean up old sync sessions
   */
  async cleanupSyncSessions(maxAgeHours: number = 24): Promise<DatabaseOperationResult<number>> {
    return safeAsync(async () => {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [sessionId, session] of this.activeSyncSessions.entries()) {
        if (session.startTime < cutoffTime) {
          this.activeSyncSessions.delete(sessionId);
          cleanedCount++;
        }
      }

      return {
        success: true,
        data: cleanedCount,
        operationTime: Date.now()
      };
    }, { operation: 'cleanup_sync_sessions' });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Sync flashcards with conflict resolution
   */
  private async syncFlashcards(
    syncSession: SyncSession,
    flashcards: FlashcardDocument[],
    options: { resolveConflicts: string; skipExisting: boolean; batchSize: number }
  ): Promise<void> {
    for (let i = 0; i < flashcards.length; i += options.batchSize) {
      const batch = flashcards.slice(i, i + options.batchSize);

      for (const flashcard of batch) {
        try {
          // Check if flashcard exists remotely
          const existingResult = await flashcardsService.getFlashcardById(flashcard.cardId, syncSession.userId);

          if (existingResult.success && existingResult.data) {
            // Conflict: flashcard exists both locally and remotely
            const conflict = await this.createConflict(
              syncSession,
              'flashcards',
              flashcard.cardId,
              flashcard,
              existingResult.data,
              'update'
            );

            await this.resolveConflictAutomatically(conflict, options.resolveConflicts);
          } else {
            // Create new flashcard
            await flashcardsService.createFlashcard(flashcard, syncSession.userId);
          }

          syncSession.syncedItems++;
        } catch (error) {
          syncSession.errors.push(`Failed to sync flashcard ${flashcard.cardId}: ${error}`);
        }
      }
    }
  }

  /**
   * Sync study sessions
   */
  private async syncStudySessions(
    syncSession: SyncSession,
    sessions: StudySessionDocument[],
    options: { resolveConflicts: string; skipExisting: boolean; batchSize: number }
  ): Promise<void> {
    for (let i = 0; i < sessions.length; i += options.batchSize) {
      const batch = sessions.slice(i, i + options.batchSize);

      for (const session of batch) {
        try {
          // Check if session exists remotely
          const existingResult = await studySessionsService.getStudySessionById(session.sessionId, syncSession.userId);

          if (existingResult.success && existingResult.data) {
            // Conflict: session exists both locally and remotely
            const conflict = await this.createConflict(
              syncSession,
              'study_sessions',
              session.sessionId,
              session,
              existingResult.data,
              'update'
            );

            await this.resolveConflictAutomatically(conflict, options.resolveConflicts);
          } else {
            // Create new session
            await studySessionsService.createStudySession(session, syncSession.userId);
          }

          syncSession.syncedItems++;
        } catch (error) {
          syncSession.errors.push(`Failed to sync study session ${session.sessionId}: ${error}`);
        }
      }
    }
  }

  /**
   * Sync study statistics
   */
  private async syncStudyStatistics(
    syncSession: SyncSession,
    statistics: StudyStatisticsDocument[],
    options: { resolveConflicts: string; skipExisting: boolean; batchSize: number }
  ): Promise<void> {
    for (let i = 0; i < statistics.length; i += options.batchSize) {
      const batch = statistics.slice(i, i + options.batchSize);

      for (const stats of batch) {
        try {
          // Check if statistics exist remotely
          const existingResult = await studyStatisticsService.getStudyStatisticsById(stats.statsId, syncSession.userId);

          if (existingResult.success && existingResult.data) {
            // Conflict: statistics exist both locally and remotely
            const conflict = await this.createConflict(
              syncSession,
              'study_statistics',
              stats.statsId,
              stats,
              existingResult.data,
              'update'
            );

            await this.resolveConflictAutomatically(conflict, options.resolveConflicts);
          } else {
            // Create new statistics
            await studyStatisticsService.createStudyStatistics(stats, syncSession.userId);
          }

          syncSession.syncedItems++;
        } catch (error) {
          syncSession.errors.push(`Failed to sync study statistics ${stats.statsId}: ${error}`);
        }
      }
    }
  }

  /**
   * Create a sync conflict
   */
  private async createConflict(
    syncSession: SyncSession,
    collection: string,
    documentId: string,
    localVersion: any,
    remoteVersion: any,
    conflictType: 'create' | 'update' | 'delete'
  ): Promise<SyncConflict> {
    const conflict: SyncConflict = {
      collection,
      documentId,
      localVersion,
      remoteVersion,
      conflictType,
      resolved: false,
      timestamp: new Date()
    };

    syncSession.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Automatically resolve a conflict
   */
  private async resolveConflictAutomatically(
    conflict: SyncConflict,
    resolutionStrategy: string
  ): Promise<void> {
    switch (resolutionStrategy) {
      case 'local':
        conflict.resolution = 'local';
        conflict.resolved = true;
        await this.applyLocalVersion(conflict);
        break;

      case 'remote':
        conflict.resolution = 'remote';
        conflict.resolved = true;
        // Remote version is already current, no action needed
        break;

      case 'merge':
        conflict.resolution = 'merge';
        conflict.resolved = true;
        await this.mergeVersions(conflict);
        break;

      default:
        // Leave for manual resolution
        break;
    }
  }

  /**
   * Apply conflict resolution
   */
  private async applyConflictResolution(
    conflict: SyncConflict,
    resolution: { resolution: string; mergedData?: any }
  ): Promise<void> {
    switch (resolution.resolution) {
      case 'local':
        await this.applyLocalVersion(conflict);
        break;

      case 'remote':
        // Remote version is already current
        break;

      case 'merge':
        if (resolution.mergedData) {
          await this.applyMergedVersion(conflict, resolution.mergedData);
        } else {
          await this.mergeVersions(conflict);
        }
        break;

      case 'manual':
        // Manual resolution would be handled by the client
        break;
    }
  }

  /**
   * Apply local version to resolve conflict
   */
  private async applyLocalVersion(conflict: SyncConflict): Promise<void> {
    const dbOps = createDatabaseOperations(conflict.collection);

    switch (conflict.collection) {
      case 'flashcards':
        await flashcardsService.updateFlashcard(
          conflict.documentId,
          conflict.localVersion,
          conflict.localVersion.userId
        );
        break;

      case 'study_sessions':
        await studySessionsService.updateSessionProgress(
          conflict.documentId,
          {
            cardsStudied: conflict.localVersion.cardsStudied,
            currentPerformance: conflict.localVersion.performance
          },
          conflict.localVersion.userId
        );
        break;

      case 'study_statistics':
        await studyStatisticsService.updateStudyStatistics(
          conflict.documentId,
          conflict.localVersion,
          conflict.localVersion.userId
        );
        break;
    }
  }

  /**
   * Merge local and remote versions
   */
  private async mergeVersions(conflict: SyncConflict): Promise<void> {
    // Simple merge strategy: take the most recent update
    const localTime = new Date(conflict.localVersion.updatedAt || conflict.localVersion.createdAt).getTime();
    const remoteTime = new Date(conflict.remoteVersion.updatedAt || conflict.remoteVersion.createdAt).getTime();

    if (localTime > remoteTime) {
      await this.applyLocalVersion(conflict);
    }
    // Otherwise keep remote version
  }

  /**
   * Apply merged version
   */
  private async applyMergedVersion(conflict: SyncConflict, mergedData: any): Promise<void> {
    const dbOps = createDatabaseOperations(conflict.collection);

    switch (conflict.collection) {
      case 'flashcards':
        await flashcardsService.updateFlashcard(
          conflict.documentId,
          mergedData,
          mergedData.userId
        );
        break;

      case 'study_sessions':
        await studySessionsService.updateSessionProgress(
          conflict.documentId,
          {
            cardsStudied: mergedData.cardsStudied,
            currentPerformance: mergedData.performance
          },
          mergedData.userId
        );
        break;

      case 'study_statistics':
        await studyStatisticsService.updateStudyStatistics(
          conflict.documentId,
          mergedData,
          mergedData.userId
        );
        break;
    }
  }

  /**
   * Get pending sync counts
   */
  private async getPendingSyncCounts(userId: string, since?: Date): Promise<any> {
    const counts = {
      flashcards: 0,
      studySessions: 0,
      studyStatistics: 0
    };

    if (since) {
      // Count items modified since last sync
      const flashcardsResult = await flashcardsService.getDueFlashcards(userId, { limit: 10000 });
      if (flashcardsResult.success && flashcardsResult.data) {
        counts.flashcards = flashcardsResult.data.filter(card =>
          new Date(card.updatedAt) > since
        ).length;
      }

      const sessionsResult = await studySessionsService.getUserStudySessions(userId, {
        limit: 1000,
        dateRange: { start: since, end: new Date() }
      });
      if (sessionsResult.success && sessionsResult.data) {
        counts.studySessions = sessionsResult.data.length;
      }

      const statsResult = await studyStatisticsService.getStudyStatisticsRange(
        userId,
        since,
        new Date(),
        'daily',
        { limit: 1000 }
      );
      if (statsResult.success && statsResult.data) {
        counts.studyStatistics = statsResult.data.length;
      }
    }

    return counts;
  }

  /**
   * Transform migration data
   */
  private async transformMigrationData(
    sourceData: any,
    userId: string
  ): Promise<any> {
    const transformed = { ...sourceData };

    // Transform flashcards
    if (transformed.flashcards) {
      transformed.flashcards = transformed.flashcards.map((card: any) => ({
        ...card,
        userId,
        cardId: card.cardId || `card_${Date.now()}_${Math.random()}`,
        createdAt: card.createdAt || new Date(),
        updatedAt: card.updatedAt || new Date()
      }));
    }

    // Transform study sessions
    if (transformed.studySessions) {
      transformed.studySessions = transformed.studySessions.map((session: any) => ({
        ...session,
        userId,
        sessionId: session.sessionId || `session_${Date.now()}_${Math.random()}`,
        createdAt: session.createdAt || new Date(),
        updatedAt: session.updatedAt || new Date()
      }));
    }

    // Transform study statistics
    if (transformed.studyStatistics) {
      transformed.studyStatistics = transformed.studyStatistics.map((stats: any) => ({
        ...stats,
        userId,
        statsId: stats.statsId || `stats_${Date.now()}_${Math.random()}`,
        createdAt: stats.createdAt || new Date(),
        updatedAt: stats.updatedAt || new Date()
      }));
    }

    return transformed;
  }

  /**
   * Validate migration data
   */
  private async validateMigrationData(data: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate flashcards
    if (data.flashcards) {
      for (const card of data.flashcards) {
        if (!card.front || !card.back || !card.category) {
          errors.push(`Invalid flashcard: missing required fields`);
        }
      }
    }

    // Validate study sessions
    if (data.studySessions) {
      for (const session of data.studySessions) {
        if (!session.startTime || !session.cardsStudied) {
          errors.push(`Invalid study session: missing required fields`);
        }
      }
    }

    // Validate study statistics
    if (data.studyStatistics) {
      for (const stats of data.studyStatistics) {
        if (!stats.date || !stats.dailyStats) {
          errors.push(`Invalid study statistics: missing required fields`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const syncService = new SyncService();
export default syncService;