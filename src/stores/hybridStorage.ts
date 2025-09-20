/**
 * Hybrid Storage System - Combines localStorage cache with MongoDB remote storage
 *
 * This module provides a unified interface for data operations that automatically
 * handles caching, synchronization, offline support, and conflict resolution.
 */

import { map } from 'nanostores';
import type { FlashcardData, StudySession, ProgressStats, StudyProfile } from '../types';
import type {
  FlashcardDocument,
  StudySessionDocument
} from '../types/database';

// Import MongoDB services conditionally (server-side only)
let flashcardsService: unknown = null;
let studySessionsService: unknown = null;
let studyStatisticsService: unknown = null;
let syncService: unknown = null;

// Lazy load services only when needed and on server side
const loadServices = async () => {
  if (typeof window === 'undefined' && !flashcardsService) {
    try {
      const services = await import('../services');
      flashcardsService = services.flashcardsService;
      studySessionsService = services.studySessionsService;
      studyStatisticsService = services.studyStatisticsService;
      syncService = services.syncService;
    } catch (error) {
      console.warn('MongoDB services not available:', error);
    }
  }
};

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTimestamp: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
  lastSyncError: string | null;
  retryCount: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  version: number;
  isDirty: boolean; // Has local changes that need to be synced
}

export interface HybridStorageConfig {
  cacheExpiryMs: number;
  maxRetryAttempts: number;
  syncIntervalMs: number;
  enableBackgroundSync: boolean;
  conflictResolutionStrategy: 'local' | 'remote' | 'merge' | 'manual';
}

export interface DataMigrationResult {
  success: boolean;
  migratedItems: number;
  skippedItems: number;
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: HybridStorageConfig = {
  cacheExpiryMs: 30 * 60 * 1000, // 30 minutes
  maxRetryAttempts: 3,
  syncIntervalMs: 5 * 60 * 1000, // 5 minutes
  enableBackgroundSync: true,
  conflictResolutionStrategy: 'merge'
};

const STORAGE_KEYS = {
  flashcards: 'linguaflip_flashcards_cache',
  studySessions: 'linguaflip_sessions_cache',
  progressStats: 'linguaflip_progress_cache',
  studyProfiles: 'linguaflip_profiles_cache',
  syncStatus: 'linguaflip_sync_status',
  lastSync: 'linguaflip_last_sync'
} as const;


// ============================================================================
// HYBRID STORAGE CLASS
// ============================================================================

export class HybridStorage {
  private config: HybridStorageConfig;
  private syncStatusStore = map<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncTimestamp: null,
    pendingChanges: 0,
    syncInProgress: false,
    lastSyncError: null,
    retryCount: 0
  });

  private cacheStores = {
    flashcards: new Map<string, CacheEntry<FlashcardData[]>>(),
    studySessions: new Map<string, CacheEntry<StudySession[]>>(),
    progressStats: new Map<string, CacheEntry<ProgressStats>>(),
    studyProfiles: new Map<string, CacheEntry<StudyProfile[]>>()
  };

  private syncIntervalId: number | null = null;
  private retryTimeouts: Map<string, number> = new Map();

  constructor(config: Partial<HybridStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initialize(): void {
    this.loadCacheFromLocalStorage();
    this.setupNetworkListeners();
    this.setupPeriodicSync();
    this.loadSyncStatus();
  }

  private loadCacheFromLocalStorage(): void {
    // Only run on client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Load flashcards cache
      const flashcardsCache = localStorage.getItem(STORAGE_KEYS.flashcards);
      if (flashcardsCache) {
        const parsed = JSON.parse(flashcardsCache);
        this.cacheStores.flashcards.set('default', {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }

      // Load study sessions cache
      const sessionsCache = localStorage.getItem(STORAGE_KEYS.studySessions);
      if (sessionsCache) {
        const parsed = JSON.parse(sessionsCache);
        this.cacheStores.studySessions.set('default', {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }

      // Load progress stats cache
      const progressCache = localStorage.getItem(STORAGE_KEYS.progressStats);
      if (progressCache) {
        const parsed = JSON.parse(progressCache);
        this.cacheStores.progressStats.set('default', {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }

      // Load study profiles cache
      const profilesCache = localStorage.getItem(STORAGE_KEYS.studyProfiles);
      if (profilesCache) {
        const parsed = JSON.parse(profilesCache);
        this.cacheStores.studyProfiles.set('default', {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }
    } catch (error) {
      console.error('Failed to load cache from localStorage:', error);
    }
  }

  private loadSyncStatus(): void {
    // Only run on client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const syncStatus = localStorage.getItem(STORAGE_KEYS.syncStatus);
      if (syncStatus) {
        const parsed = JSON.parse(syncStatus);
        this.syncStatusStore.set({
          ...this.syncStatusStore.get(),
          lastSyncTimestamp: parsed.lastSyncTimestamp ? new Date(parsed.lastSyncTimestamp) : null,
          pendingChanges: parsed.pendingChanges || 0,
          lastSyncError: parsed.lastSyncError || null,
          retryCount: parsed.retryCount || 0
        });
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  private setupNetworkListeners(): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => {
      this.syncStatusStore.setKey('isOnline', true);
      this.performSync();
    });

    window.addEventListener('offline', () => {
      this.syncStatusStore.setKey('isOnline', false);
    });
  }

  private setupPeriodicSync(): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    if (this.config.enableBackgroundSync) {
      this.syncIntervalId = window.setInterval(() => {
        if (this.syncStatusStore.get().isOnline) {
          this.performSync();
        }
      }, this.config.syncIntervalMs);
    }
  }

  // ============================================================================
  // FLASHCARDS OPERATIONS
  // ============================================================================

  async getFlashcards(userId: string, forceRefresh = false): Promise<FlashcardData[]> {
    const cacheKey = userId;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.cacheStores.flashcards.get(cacheKey);
      if (cached && !this.isCacheExpired(cached)) {
        return cached.data;
      }
    }

    // Try to fetch from MongoDB (only if services are available)
    if (flashcardsService) {
      try {
        const result = await (flashcardsService as any).getDueFlashcards(userId, {
          limit: 1000,
          includeSuspended: true
        });

        if (result.success && result.data) {
          const flashcards = this.convertMongoFlashcardsToLocal(result.data);
          this.updateCache('flashcards', cacheKey, flashcards, false);
          return flashcards;
        }
      } catch (error) {
        console.error('Failed to fetch flashcards from MongoDB:', error);
      }
    } else {
      // Try to load services if not available
      await loadServices();
      if (flashcardsService) {
        try {
          const result = await (flashcardsService as any).getDueFlashcards(userId, {
            limit: 1000,
            includeSuspended: true
          });

          if (result.success && result.data) {
            const flashcards = this.convertMongoFlashcardsToLocal(result.data);
            this.updateCache('flashcards', cacheKey, flashcards, false);
            return flashcards;
          }
        } catch (error) {
          console.error('Failed to fetch flashcards from MongoDB after loading services:', error);
        }
      }
    }

    // Fallback to cache or empty array
    const cached = this.cacheStores.flashcards.get(cacheKey);
    return cached?.data || [];
  }

  async saveFlashcard(userId: string, flashcard: FlashcardData): Promise<void> {
    // Update cache immediately
    const cacheKey = userId;
    const currentCache = this.cacheStores.flashcards.get(cacheKey);
    const currentData = currentCache?.data || [];

    const updatedData = flashcard.id
      ? currentData.map(card => card.id === flashcard.id ? flashcard : card)
      : [...currentData, flashcard];

    this.updateCache('flashcards', cacheKey, updatedData, true);

    // Try to sync with MongoDB
    if (this.syncStatusStore.get().isOnline) {
      // Ensure services are loaded
      if (!flashcardsService) {
        await loadServices();
      }

      if (flashcardsService) {
        try {
          const mongoCard = this.convertLocalFlashcardToMongo(flashcard, userId);

          if (flashcard.id) {
            // Update existing
            await (flashcardsService as any).updateFlashcard(flashcard.id.toString(), mongoCard, userId);
          } else {
            // Create new
            const result = await (flashcardsService as any).createFlashcard(mongoCard, userId);
            if (result.success && result.data) {
              // Update local cache with MongoDB ID
              const updatedCard = { ...flashcard, id: parseInt(result.data.cardId) };
              const finalData = updatedData.map(card =>
                card === flashcard ? updatedCard : card
              );
              this.updateCache('flashcards', cacheKey, finalData, false);
            }
          }
        } catch (error) {
          console.error('Failed to sync flashcard to MongoDB:', error);
          this.scheduleRetry('flashcard', userId, flashcard);
        }
      }
    }
  }

  async deleteFlashcard(userId: string, flashcardId: number): Promise<void> {
    // Update cache immediately
    const cacheKey = userId;
    const currentCache = this.cacheStores.flashcards.get(cacheKey);
    const currentData = currentCache?.data || [];

    const updatedData = currentData.filter(card => card.id !== flashcardId);
    this.updateCache('flashcards', cacheKey, updatedData, true);

    // Try to sync with MongoDB
    if (this.syncStatusStore.get().isOnline) {
      try {
        await (flashcardsService as any).deleteFlashcard(flashcardId.toString(), userId);
      } catch (error) {
        console.error('Failed to delete flashcard from MongoDB:', error);
        this.scheduleRetry('delete_flashcard', userId, { flashcardId });
      }
    }
  }

  // ============================================================================
  // STUDY SESSIONS OPERATIONS
  // ============================================================================

  async getStudySessions(userId: string, forceRefresh = false): Promise<StudySession[]> {
    const cacheKey = userId;

    if (!forceRefresh) {
      const cached = this.cacheStores.studySessions.get(cacheKey);
      if (cached && !this.isCacheExpired(cached)) {
        return cached.data;
      }
    }

    try {
      const result = await (studySessionsService as any).getUserStudySessions(userId, {
        limit: 100,
        sortBy: 'startTime',
        sortOrder: -1
      });

      if (result.success && result.data) {
        const sessions = this.convertMongoSessionsToLocal(result.data);
        this.updateCache('studySessions', cacheKey, sessions, false);
        return sessions;
      }
    } catch (error) {
      console.error('Failed to fetch study sessions from MongoDB:', error);
    }

    const cached = this.cacheStores.studySessions.get(cacheKey);
    return cached?.data || [];
  }

  async saveStudySession(userId: string, session: StudySession): Promise<void> {
    const cacheKey = userId;
    const currentCache = this.cacheStores.studySessions.get(cacheKey);
    const currentData = currentCache?.data || [];

    const updatedData = [...currentData, session];
    this.updateCache('studySessions', cacheKey, updatedData, true);

    if (this.syncStatusStore.get().isOnline) {
      try {
        const mongoSession = this.convertLocalSessionToMongo(session, userId);
        await (studySessionsService as any).createStudySession(mongoSession, userId);
      } catch (error) {
        console.error('Failed to sync study session to MongoDB:', error);
        this.scheduleRetry('study_session', userId, session);
      }
    }
  }

  // ============================================================================
  // PROGRESS STATS OPERATIONS
  // ============================================================================

  async getProgressStats(userId: string, forceRefresh = false): Promise<ProgressStats> {
    const cacheKey = userId;

    if (!forceRefresh) {
      const cached = this.cacheStores.progressStats.get(cacheKey);
      if (cached && !this.isCacheExpired(cached)) {
        return cached.data;
      }
    }

    try {
      const result = await (studyStatisticsService as any).getStudyStatisticsByDate(userId, new Date(), 'daily');

      if (result.success && result.data) {
        const stats = this.convertMongoStatsToLocal(result.data);
        this.updateCache('progressStats', cacheKey, stats, false);
        return stats;
      }
    } catch (error) {
      console.error('Failed to fetch progress stats from MongoDB:', error);
    }

    const cached = this.cacheStores.progressStats.get(cacheKey);
    return cached?.data || this.getDefaultProgressStats();
  }

  // ============================================================================
  // SYNCHRONIZATION
  // ============================================================================

  async performSync(userId?: string): Promise<void> {
    if (this.syncStatusStore.get().syncInProgress) {
      return; // Already syncing
    }

    this.syncStatusStore.setKey('syncInProgress', true);
    this.syncStatusStore.setKey('lastSyncError', null);

    try {
      // Sync all dirty data
      await this.syncDirtyData(userId);

      // Update sync timestamp
      const now = new Date();
      this.syncStatusStore.setKey('lastSyncTimestamp', now);
      this.syncStatusStore.setKey('pendingChanges', 0);

      // Save sync status to localStorage
      this.saveSyncStatus();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.syncStatusStore.setKey('lastSyncError', errorMessage);
      console.error('Sync failed:', error);
    } finally {
      this.syncStatusStore.setKey('syncInProgress', false);
    }
  }

  private async syncDirtyData(userId?: string): Promise<void> {
    const usersToSync = userId ? [userId] : this.getUsersWithDirtyData();

    for (const user of usersToSync) {
      await this.syncUserData(user);
    }
  }

  private async syncUserData(userId: string): Promise<void> {
    // Sync flashcards
    const flashcardsCache = this.cacheStores.flashcards.get(userId);
    if (flashcardsCache?.isDirty) {
      await this.syncFlashcards(userId, flashcardsCache.data);
    }

    // Sync study sessions
    const sessionsCache = this.cacheStores.studySessions.get(userId);
    if (sessionsCache?.isDirty) {
      await this.syncStudySessions(userId, sessionsCache.data);
    }
  }

  private async syncFlashcards(userId: string, flashcards: FlashcardData[]): Promise<void> {
    try {
      const mongoCards = flashcards.map(card => this.convertLocalFlashcardToMongo(card, userId));

      const result = await (syncService as any).syncFromLocal(userId, {
        flashcards: mongoCards
      }, {
        resolveConflicts: this.config.conflictResolutionStrategy === 'manual' ? 'merge' : this.config.conflictResolutionStrategy,
        skipExisting: false,
        batchSize: 50
      });

      if (result.success) {
        // Mark cache as clean
        const cache = this.cacheStores.flashcards.get(userId);
        if (cache) {
          cache.isDirty = false;
          this.saveCacheToLocalStorage('flashcards', userId, cache);
        }
      }
    } catch (error) {
      console.error('Failed to sync flashcards:', error);
      throw error;
    }
  }

  private async syncStudySessions(userId: string, sessions: StudySession[]): Promise<void> {
    try {
      const mongoSessions = sessions.map(session => this.convertLocalSessionToMongo(session, userId));

      const result = await (syncService as any).syncFromLocal(userId, {
        studySessions: mongoSessions
      }, {
        resolveConflicts: this.config.conflictResolutionStrategy === 'manual' ? 'merge' : this.config.conflictResolutionStrategy,
        skipExisting: false,
        batchSize: 50
      });

      if (result.success) {
        const cache = this.cacheStores.studySessions.get(userId);
        if (cache) {
          cache.isDirty = false;
          this.saveCacheToLocalStorage('studySessions', userId, cache);
        }
      }
    } catch (error) {
      console.error('Failed to sync study sessions:', error);
      throw error;
    }
  }

  // ============================================================================
  // DATA MIGRATION
  // ============================================================================

  async migrateLocalStorageToMongoDB(userId: string): Promise<DataMigrationResult> {
    const result: DataMigrationResult = {
      success: true,
      migratedItems: 0,
      skippedItems: 0,
      errors: []
    };

    try {
      // Migrate flashcards
      const flashcardsCache = this.cacheStores.flashcards.get(userId);
      if (flashcardsCache?.data.length) {
        const mongoCards = flashcardsCache.data.map(card =>
          this.convertLocalFlashcardToMongo(card, userId)
        );

        const flashcardsResult = await (syncService as any).migrateUserData(userId, {
          flashcards: mongoCards
        });

        if (flashcardsResult.success && flashcardsResult.data) {
          result.migratedItems += flashcardsResult.data.migratedItems.flashcards;
          result.errors.push(...flashcardsResult.data.errors);
        }
      }

      // Migrate study sessions
      const sessionsCache = this.cacheStores.studySessions.get(userId);
      if (sessionsCache?.data.length) {
        const mongoSessions = sessionsCache.data.map(session =>
          this.convertLocalSessionToMongo(session, userId)
        );

        const sessionsResult = await (syncService as any).migrateUserData(userId, {
          studySessions: mongoSessions
        });

        if (sessionsResult.success && sessionsResult.data) {
          result.migratedItems += sessionsResult.data.migratedItems.studySessions;
          result.errors.push(...sessionsResult.data.errors);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Migration failed');
    }

    return result;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private updateCache<T>(
    storeType: keyof typeof STORAGE_KEYS,
    key: string,
    data: T,
    isDirty: boolean
  ): void {
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      version: 1,
      isDirty
    };

    switch (storeType) {
      case 'flashcards':
        this.cacheStores.flashcards.set(key, cacheEntry as CacheEntry<FlashcardData[]>);
        break;
      case 'studySessions':
        this.cacheStores.studySessions.set(key, cacheEntry as CacheEntry<StudySession[]>);
        break;
      case 'progressStats':
        this.cacheStores.progressStats.set(key, cacheEntry as CacheEntry<ProgressStats>);
        break;
      case 'studyProfiles':
        this.cacheStores.studyProfiles.set(key, cacheEntry as CacheEntry<StudyProfile[]>);
        break;
    }

    this.saveCacheToLocalStorage(storeType, key, cacheEntry);

    if (isDirty) {
      const currentStatus = this.syncStatusStore.get();
      this.syncStatusStore.setKey('pendingChanges', currentStatus.pendingChanges + 1);
    }
  }

  private saveCacheToLocalStorage<T>(
    storeType: keyof typeof STORAGE_KEYS,
    _key: string,
    cacheEntry: CacheEntry<T>
  ): void {
    // Only run on client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const storageKey = STORAGE_KEYS[storeType];
      const dataToStore = {
        data: cacheEntry.data,
        timestamp: cacheEntry.timestamp.toISOString(),
        version: cacheEntry.version,
        isDirty: cacheEntry.isDirty
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
    }
  }

  private saveSyncStatus(): void {
    // Only run on client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const status = this.syncStatusStore.get();
      const dataToStore = {
        lastSyncTimestamp: status.lastSyncTimestamp?.toISOString(),
        pendingChanges: status.pendingChanges,
        lastSyncError: status.lastSyncError,
        retryCount: status.retryCount
      };
      localStorage.setItem(STORAGE_KEYS.syncStatus, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  private isCacheExpired(cacheEntry: CacheEntry<unknown>): boolean {
    const now = new Date();
    const age = now.getTime() - cacheEntry.timestamp.getTime();
    return age > this.config.cacheExpiryMs;
  }

  private scheduleRetry(operation: string, userId: string, data: unknown): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const retryKey = `${operation}_${userId}_${Date.now()}`;

    const timeoutId = window.setTimeout(async () => {
      try {
        await this.performRetry(operation, userId, data);
      } finally {
        this.retryTimeouts.delete(retryKey);
      }
    }, Math.pow(2, this.syncStatusStore.get().retryCount) * 1000); // Exponential backoff

    this.retryTimeouts.set(retryKey, timeoutId);

    const currentStatus = this.syncStatusStore.get();
    this.syncStatusStore.setKey('retryCount', currentStatus.retryCount + 1);
  }

  private async performRetry(operation: string, userId: string, data: unknown): Promise<void> {
    const currentStatus = this.syncStatusStore.get();

    if (currentStatus.retryCount >= this.config.maxRetryAttempts) {
      console.error(`Max retry attempts reached for ${operation}`);
      return;
    }

    try {
      switch (operation) {
        case 'flashcard':
          await this.saveFlashcard(userId, data as FlashcardData);
          break;
        case 'study_session':
          await this.saveStudySession(userId, data as StudySession);
          break;
        case 'delete_flashcard':
          await this.deleteFlashcard(userId, (data as any).flashcardId);
          break;
      }

      // Reset retry count on success
      this.syncStatusStore.setKey('retryCount', 0);
    } catch (error) {
      console.error(`Retry failed for ${operation}:`, error);
      // Schedule another retry
      this.scheduleRetry(operation, userId, data);
    }
  }

  private getUsersWithDirtyData(): string[] {
    const users = new Set<string>();

    // Check flashcards
    for (const [userId, cache] of this.cacheStores.flashcards.entries()) {
      if (cache.isDirty) users.add(userId);
    }

    // Check study sessions
    for (const [userId, cache] of this.cacheStores.studySessions.entries()) {
      if (cache.isDirty) users.add(userId);
    }

    return Array.from(users);
  }

  // ============================================================================
  // DATA CONVERSION METHODS
  // ============================================================================

  private convertMongoFlashcardsToLocal(mongoCards: FlashcardDocument[]): FlashcardData[] {
    return mongoCards.map(card => ({
      id: parseInt(card.cardId),
      english: card.front,
      spanish: card.back,
      exampleEnglish: card.exampleFront,
      exampleSpanish: card.exampleBack,
      image: card.image,
      dueDate: card.sm2.nextReviewDate.toISOString().split('T')[0],
      interval: card.sm2.interval,
      easinessFactor: card.sm2.easeFactor,
      repetitions: card.sm2.repetitions,
      lastReviewed: card.sm2.lastReviewed?.toISOString() || null
    }));
  }

  private convertLocalFlashcardToMongo(card: FlashcardData, userId: string): Omit<FlashcardDocument, '_id' | 'createdAt' | 'updatedAt'> {
    return {
      cardId: card.id.toString(),
      userId,
      front: card.english,
      back: card.spanish,
      exampleFront: card.exampleEnglish,
      exampleBack: card.exampleSpanish,
      image: card.image,
      category: 'general',
      difficulty: 'medium',
      tags: [],
      sm2: {
        repetitions: card.repetitions,
        easeFactor: card.easinessFactor,
        interval: card.interval,
        nextReviewDate: new Date(card.dueDate),
        lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : null,
        qualityResponses: [],
        totalReviews: 0,
        isSuspended: false,
        suspensionReason: null
      },
      statistics: {
        timesCorrect: 0,
        timesIncorrect: 0,
        averageResponseTime: 0,
        lastDifficulty: 'medium'
      }
    };
  }

  private convertMongoSessionsToLocal(mongoSessions: StudySessionDocument[]): StudySession[] {
    return mongoSessions.map(session => ({
      id: session.sessionId,
      date: session.date,
      cardsReviewed: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
      totalTime: session.totalTime,
      averageResponseTime: session.averageResponseTime
    }));
  }

  private convertLocalSessionToMongo(session: StudySession, userId: string): Omit<StudySessionDocument, '_id' | 'createdAt' | 'updatedAt'> {
    return {
      sessionId: session.id,
      userId,
      date: session.date,
      cardsReviewed: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
      totalTime: session.totalTime,
      averageResponseTime: session.averageResponseTime,
      mode: 'mixed',
      difficulty: 'medium',
      profileId: 'default'
    };
  }

  private convertMongoStatsToLocal(stats: Record<string, unknown>): ProgressStats {
    // Convert MongoDB stats to local ProgressStats format with proper type conversion
    return {
      totalCards: Number(stats.totalCards) || 0,
      cardsMastered: Number(stats.matureCards) || 0,
      cardsInProgress: Number(stats.learningCards) || 0,
      cardsNew: Number(stats.newCards) || 0,
      currentStreak: 0, // Would need to calculate from session data
      longestStreak: 0,
      totalStudyTime: Number(stats.totalStudyTime) || 0,
      averageAccuracy: Number(stats.averageAccuracy) || 0,
      studySessionsToday: 0,
      studySessionsThisWeek: 0,
      studySessionsThisMonth: 0
    };
  }

  private getDefaultProgressStats(): ProgressStats {
    return {
      totalCards: 0,
      cardsMastered: 0,
      cardsInProgress: 0,
      cardsNew: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalStudyTime: 0,
      averageAccuracy: 0,
      studySessionsToday: 0,
      studySessionsThisWeek: 0,
      studySessionsThisMonth: 0
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getSyncStatus(): SyncStatus {
    return this.syncStatusStore.get();
  }

  getSyncStatusStore() {
    return this.syncStatusStore;
  }

  async forceSync(userId?: string): Promise<void> {
    await this.performSync(userId);
  }

  clearCache(): void {
    this.cacheStores.flashcards.clear();
    this.cacheStores.studySessions.clear();
    this.cacheStores.progressStats.clear();
    this.cacheStores.studyProfiles.clear();

    // Clear localStorage (client-side only)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.retryTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.retryTimeouts.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const hybridStorage = new HybridStorage();

// ============================================================================
// HOOKS FOR REACT COMPONENTS
// ============================================================================

import { useStore } from '@nanostores/react';

export function useSyncStatus() {
  return useStore(hybridStorage.getSyncStatusStore());
}

export function useHybridStorage() {
  return hybridStorage;
}