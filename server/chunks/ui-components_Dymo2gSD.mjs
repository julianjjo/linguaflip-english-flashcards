import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import React, { useEffect, createContext, useContext, useState } from 'react';
import { useStore } from '@nanostores/react';
import { map, atom, computed } from 'nanostores';
import { f as flashcardsStore, s as setCurrentUser, a as flashcardsActions, C as CreateFlashcardButton } from './flashcard-components_CMlRFbcC.mjs';
import { u as useTheme } from './hooks_D2ypma6R.mjs';
import { c as createComponent, a as createAstro, m as maybeRenderHead, b as addAttribute, r as renderScript, d as renderTemplate } from './vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import 'clsx';
import { A as AuthStateManager, S as SecureTokenStorage, T as TokenRefreshManager, a as SecurityAuditor } from './utils_B4MKaY9u.mjs';

let flashcardsService = null;
let studySessionsService = null;
let studyStatisticsService = null;
let syncService = null;
const loadServices = async () => {
  if (typeof window === "undefined" && !flashcardsService) {
    try {
      const services = await import('./index_CimYvAf3.mjs');
      flashcardsService = services.flashcardsService;
      studySessionsService = services.studySessionsService;
      studyStatisticsService = services.studyStatisticsService;
      syncService = services.syncService;
    } catch (error) {
      console.warn("MongoDB services not available:", error);
    }
  }
};
const DEFAULT_CONFIG = {
  cacheExpiryMs: 30 * 60 * 1e3,
  // 30 minutes
  maxRetryAttempts: 3,
  syncIntervalMs: 5 * 60 * 1e3,
  // 5 minutes
  enableBackgroundSync: true,
  conflictResolutionStrategy: "merge"
};
const STORAGE_KEYS = {
  flashcards: "linguaflip_flashcards_cache",
  studySessions: "linguaflip_sessions_cache",
  progressStats: "linguaflip_progress_cache",
  studyProfiles: "linguaflip_profiles_cache",
  syncStatus: "linguaflip_sync_status",
  lastSync: "linguaflip_last_sync"
};
class HybridStorage {
  constructor(config = {}) {
    this.syncStatusStore = map({
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      lastSyncTimestamp: null,
      pendingChanges: 0,
      syncInProgress: false,
      lastSyncError: null,
      retryCount: 0
    });
    this.cacheStores = {
      flashcards: /* @__PURE__ */ new Map(),
      studySessions: /* @__PURE__ */ new Map(),
      progressStats: /* @__PURE__ */ new Map(),
      studyProfiles: /* @__PURE__ */ new Map()
    };
    this.syncIntervalId = null;
    this.retryTimeouts = /* @__PURE__ */ new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  initialize() {
    this.loadCacheFromLocalStorage();
    this.setupNetworkListeners();
    this.setupPeriodicSync();
    this.loadSyncStatus();
  }
  loadCacheFromLocalStorage() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }
    try {
      const flashcardsCache = localStorage.getItem(STORAGE_KEYS.flashcards);
      if (flashcardsCache) {
        const parsed = JSON.parse(flashcardsCache);
        this.cacheStores.flashcards.set("default", {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }
      const sessionsCache = localStorage.getItem(STORAGE_KEYS.studySessions);
      if (sessionsCache) {
        const parsed = JSON.parse(sessionsCache);
        this.cacheStores.studySessions.set("default", {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }
      const progressCache = localStorage.getItem(STORAGE_KEYS.progressStats);
      if (progressCache) {
        const parsed = JSON.parse(progressCache);
        this.cacheStores.progressStats.set("default", {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }
      const profilesCache = localStorage.getItem(STORAGE_KEYS.studyProfiles);
      if (profilesCache) {
        const parsed = JSON.parse(profilesCache);
        this.cacheStores.studyProfiles.set("default", {
          data: parsed.data,
          timestamp: new Date(parsed.timestamp),
          version: parsed.version || 1,
          isDirty: parsed.isDirty || false
        });
      }
    } catch (error) {
      console.error("Failed to load cache from localStorage:", error);
    }
  }
  loadSyncStatus() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
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
      console.error("Failed to load sync status:", error);
    }
  }
  setupNetworkListeners() {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("online", () => {
      this.syncStatusStore.setKey("isOnline", true);
      this.performSync();
    });
    window.addEventListener("offline", () => {
      this.syncStatusStore.setKey("isOnline", false);
    });
  }
  setupPeriodicSync() {
    if (typeof window === "undefined") {
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
  async getFlashcards(userId, forceRefresh = false) {
    const cacheKey = userId;
    if (!forceRefresh) {
      const cached2 = this.cacheStores.flashcards.get(cacheKey);
      if (cached2 && !this.isCacheExpired(cached2)) {
        return cached2.data;
      }
    }
    if (flashcardsService) {
      try {
        const result = await flashcardsService.getDueFlashcards(
          userId,
          {
            limit: 1e3,
            includeSuspended: true
          }
        );
        if (result.success && result.data) {
          const flashcards = this.convertMongoFlashcardsToLocal(result.data);
          this.updateCache("flashcards", cacheKey, flashcards, false);
          return flashcards;
        }
      } catch (error) {
        console.error("Failed to fetch flashcards from MongoDB:", error);
      }
    } else {
      await loadServices();
      if (flashcardsService) {
        try {
          const result = await flashcardsService.getDueFlashcards(
            userId,
            {
              limit: 1e3,
              includeSuspended: true
            }
          );
          if (result.success && result.data) {
            const flashcards = this.convertMongoFlashcardsToLocal(result.data);
            this.updateCache("flashcards", cacheKey, flashcards, false);
            return flashcards;
          }
        } catch (error) {
          console.error(
            "Failed to fetch flashcards from MongoDB after loading services:",
            error
          );
        }
      }
    }
    const cached = this.cacheStores.flashcards.get(cacheKey);
    return cached?.data || [];
  }
  async saveFlashcard(userId, flashcard) {
    const cacheKey = userId;
    const currentCache = this.cacheStores.flashcards.get(cacheKey);
    const currentData = currentCache?.data || [];
    const updatedData = flashcard.id ? currentData.map((card) => card.id === flashcard.id ? flashcard : card) : [...currentData, flashcard];
    this.updateCache("flashcards", cacheKey, updatedData, true);
    if (this.syncStatusStore.get().isOnline) {
      if (!flashcardsService) {
        await loadServices();
      }
      if (flashcardsService) {
        try {
          const mongoCard = this.convertLocalFlashcardToMongo(
            flashcard,
            userId
          );
          if (flashcard.id) {
            await flashcardsService.updateFlashcard(
              flashcard.id.toString(),
              mongoCard,
              userId
            );
          } else {
            const result = await flashcardsService.createFlashcard(
              mongoCard,
              userId
            );
            if (result.success && result.data) {
              const updatedCard = {
                ...flashcard,
                id: parseInt(result.data.cardId)
              };
              const finalData = updatedData.map(
                (card) => card === flashcard ? updatedCard : card
              );
              this.updateCache("flashcards", cacheKey, finalData, false);
            }
          }
        } catch (error) {
          console.error("Failed to sync flashcard to MongoDB:", error);
          this.scheduleRetry("flashcard", userId, flashcard);
        }
      }
    }
  }
  async deleteFlashcard(userId, flashcardId) {
    const cacheKey = userId;
    const currentCache = this.cacheStores.flashcards.get(cacheKey);
    const currentData = currentCache?.data || [];
    const updatedData = currentData.filter((card) => card.id !== flashcardId);
    this.updateCache("flashcards", cacheKey, updatedData, true);
    if (this.syncStatusStore.get().isOnline) {
      try {
        await flashcardsService.deleteFlashcard(
          flashcardId.toString(),
          userId
        );
      } catch (error) {
        console.error("Failed to delete flashcard from MongoDB:", error);
        this.scheduleRetry("delete_flashcard", userId, { flashcardId });
      }
    }
  }
  // ============================================================================
  // STUDY SESSIONS OPERATIONS
  // ============================================================================
  async getStudySessions(userId, forceRefresh = false) {
    const cacheKey = userId;
    if (!forceRefresh) {
      const cached2 = this.cacheStores.studySessions.get(cacheKey);
      if (cached2 && !this.isCacheExpired(cached2)) {
        return cached2.data;
      }
    }
    try {
      const result = await studySessionsService.getUserStudySessions(
        userId,
        {
          limit: 100,
          sortBy: "startTime",
          sortOrder: -1
        }
      );
      if (result.success && result.data) {
        const sessions = this.convertMongoSessionsToLocal(result.data);
        this.updateCache("studySessions", cacheKey, sessions, false);
        return sessions;
      }
    } catch (error) {
      console.error("Failed to fetch study sessions from MongoDB:", error);
    }
    const cached = this.cacheStores.studySessions.get(cacheKey);
    return cached?.data || [];
  }
  async saveStudySession(userId, session) {
    const cacheKey = userId;
    const currentCache = this.cacheStores.studySessions.get(cacheKey);
    const currentData = currentCache?.data || [];
    const updatedData = [...currentData, session];
    this.updateCache("studySessions", cacheKey, updatedData, true);
    if (this.syncStatusStore.get().isOnline) {
      try {
        const mongoSession = this.convertLocalSessionToMongo(session, userId);
        await studySessionsService.createStudySession(
          mongoSession,
          userId
        );
      } catch (error) {
        console.error("Failed to sync study session to MongoDB:", error);
        this.scheduleRetry("study_session", userId, session);
      }
    }
  }
  // ============================================================================
  // PROGRESS STATS OPERATIONS
  // ============================================================================
  async getProgressStats(userId, forceRefresh = false) {
    const cacheKey = userId;
    if (!forceRefresh) {
      const cached2 = this.cacheStores.progressStats.get(cacheKey);
      if (cached2 && !this.isCacheExpired(cached2)) {
        return cached2.data;
      }
    }
    try {
      const result = await studyStatisticsService.getStudyStatisticsByDate(userId, /* @__PURE__ */ new Date(), "daily");
      if (result.success && result.data) {
        const stats = this.convertMongoStatsToLocal(result.data);
        this.updateCache("progressStats", cacheKey, stats, false);
        return stats;
      }
    } catch (error) {
      console.error("Failed to fetch progress stats from MongoDB:", error);
    }
    const cached = this.cacheStores.progressStats.get(cacheKey);
    return cached?.data || this.getDefaultProgressStats();
  }
  // ============================================================================
  // SYNCHRONIZATION
  // ============================================================================
  async performSync(userId) {
    if (this.syncStatusStore.get().syncInProgress) {
      return;
    }
    this.syncStatusStore.setKey("syncInProgress", true);
    this.syncStatusStore.setKey("lastSyncError", null);
    try {
      await this.syncDirtyData(userId);
      const now = /* @__PURE__ */ new Date();
      this.syncStatusStore.setKey("lastSyncTimestamp", now);
      this.syncStatusStore.setKey("pendingChanges", 0);
      this.saveSyncStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
      this.syncStatusStore.setKey("lastSyncError", errorMessage);
      console.error("Sync failed:", error);
    } finally {
      this.syncStatusStore.setKey("syncInProgress", false);
    }
  }
  async syncDirtyData(userId) {
    const usersToSync = userId ? [userId] : this.getUsersWithDirtyData();
    for (const user of usersToSync) {
      await this.syncUserData(user);
    }
  }
  async syncUserData(userId) {
    const flashcardsCache = this.cacheStores.flashcards.get(userId);
    if (flashcardsCache?.isDirty) {
      await this.syncFlashcards(userId, flashcardsCache.data);
    }
    const sessionsCache = this.cacheStores.studySessions.get(userId);
    if (sessionsCache?.isDirty) {
      await this.syncStudySessions(userId, sessionsCache.data);
    }
  }
  async syncFlashcards(userId, flashcards) {
    try {
      const mongoCards = flashcards.map(
        (card) => this.convertLocalFlashcardToMongo(card, userId)
      );
      const result = await syncService.syncFromLocal(
        userId,
        {
          flashcards: mongoCards
        },
        {
          resolveConflicts: this.config.conflictResolutionStrategy === "manual" ? "merge" : this.config.conflictResolutionStrategy,
          skipExisting: false,
          batchSize: 50
        }
      );
      if (result.success) {
        const cache = this.cacheStores.flashcards.get(userId);
        if (cache) {
          cache.isDirty = false;
          this.saveCacheToLocalStorage("flashcards", userId, cache);
        }
      }
    } catch (error) {
      console.error("Failed to sync flashcards:", error);
      throw error;
    }
  }
  async syncStudySessions(userId, sessions) {
    try {
      const mongoSessions = sessions.map(
        (session) => this.convertLocalSessionToMongo(session, userId)
      );
      const result = await syncService.syncFromLocal(
        userId,
        {
          studySessions: mongoSessions
        },
        {
          resolveConflicts: this.config.conflictResolutionStrategy === "manual" ? "merge" : this.config.conflictResolutionStrategy,
          skipExisting: false,
          batchSize: 50
        }
      );
      if (result.success) {
        const cache = this.cacheStores.studySessions.get(userId);
        if (cache) {
          cache.isDirty = false;
          this.saveCacheToLocalStorage("studySessions", userId, cache);
        }
      }
    } catch (error) {
      console.error("Failed to sync study sessions:", error);
      throw error;
    }
  }
  // ============================================================================
  // DATA MIGRATION
  // ============================================================================
  async migrateLocalStorageToMongoDB(userId) {
    const result = {
      success: true,
      migratedItems: 0,
      skippedItems: 0,
      errors: []
    };
    try {
      const flashcardsCache = this.cacheStores.flashcards.get(userId);
      if (flashcardsCache?.data.length) {
        const mongoCards = flashcardsCache.data.map(
          (card) => this.convertLocalFlashcardToMongo(card, userId)
        );
        const flashcardsResult = await syncService.migrateUserData(
          userId,
          {
            flashcards: mongoCards
          }
        );
        if (flashcardsResult.success && flashcardsResult.data) {
          result.migratedItems += flashcardsResult.data.migratedItems.flashcards;
          result.errors.push(...flashcardsResult.data.errors);
        }
      }
      const sessionsCache = this.cacheStores.studySessions.get(userId);
      if (sessionsCache?.data.length) {
        const mongoSessions = sessionsCache.data.map(
          (session) => this.convertLocalSessionToMongo(session, userId)
        );
        const sessionsResult = await syncService.migrateUserData(
          userId,
          {
            studySessions: mongoSessions
          }
        );
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
      result.errors.push(
        error instanceof Error ? error.message : "Migration failed"
      );
    }
    return result;
  }
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  updateCache(storeType, key, data, isDirty) {
    const cacheEntry = {
      data,
      timestamp: /* @__PURE__ */ new Date(),
      version: 1,
      isDirty
    };
    switch (storeType) {
      case "flashcards":
        this.cacheStores.flashcards.set(
          key,
          cacheEntry
        );
        break;
      case "studySessions":
        this.cacheStores.studySessions.set(
          key,
          cacheEntry
        );
        break;
      case "progressStats":
        this.cacheStores.progressStats.set(
          key,
          cacheEntry
        );
        break;
      case "studyProfiles":
        this.cacheStores.studyProfiles.set(
          key,
          cacheEntry
        );
        break;
    }
    this.saveCacheToLocalStorage(storeType, key, cacheEntry);
    if (isDirty) {
      const currentStatus = this.syncStatusStore.get();
      this.syncStatusStore.setKey(
        "pendingChanges",
        currentStatus.pendingChanges + 1
      );
    }
  }
  saveCacheToLocalStorage(storeType, _key, cacheEntry) {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
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
      console.error("Failed to save cache to localStorage:", error);
    }
  }
  saveSyncStatus() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
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
      localStorage.setItem(
        STORAGE_KEYS.syncStatus,
        JSON.stringify(dataToStore)
      );
    } catch (error) {
      console.error("Failed to save sync status:", error);
    }
  }
  isCacheExpired(cacheEntry) {
    const now = /* @__PURE__ */ new Date();
    const age = now.getTime() - cacheEntry.timestamp.getTime();
    return age > this.config.cacheExpiryMs;
  }
  scheduleRetry(operation, userId, data) {
    if (typeof window === "undefined") {
      return;
    }
    const retryKey = `${operation}_${userId}_${Date.now()}`;
    const timeoutId = window.setTimeout(
      async () => {
        try {
          await this.performRetry(operation, userId, data);
        } finally {
          this.retryTimeouts.delete(retryKey);
        }
      },
      Math.pow(2, this.syncStatusStore.get().retryCount) * 1e3
    );
    this.retryTimeouts.set(retryKey, timeoutId);
    const currentStatus = this.syncStatusStore.get();
    this.syncStatusStore.setKey("retryCount", currentStatus.retryCount + 1);
  }
  async performRetry(operation, userId, data) {
    const currentStatus = this.syncStatusStore.get();
    if (currentStatus.retryCount >= this.config.maxRetryAttempts) {
      console.error(`Max retry attempts reached for ${operation}`);
      return;
    }
    try {
      switch (operation) {
        case "flashcard":
          await this.saveFlashcard(userId, data);
          break;
        case "study_session":
          await this.saveStudySession(userId, data);
          break;
        case "delete_flashcard":
          await this.deleteFlashcard(userId, data.flashcardId);
          break;
      }
      this.syncStatusStore.setKey("retryCount", 0);
    } catch (error) {
      console.error(`Retry failed for ${operation}:`, error);
      this.scheduleRetry(operation, userId, data);
    }
  }
  getUsersWithDirtyData() {
    const users = /* @__PURE__ */ new Set();
    for (const [userId, cache] of this.cacheStores.flashcards.entries()) {
      if (cache.isDirty) users.add(userId);
    }
    for (const [userId, cache] of this.cacheStores.studySessions.entries()) {
      if (cache.isDirty) users.add(userId);
    }
    return Array.from(users);
  }
  // ============================================================================
  // DATA CONVERSION METHODS
  // ============================================================================
  convertMongoFlashcardsToLocal(mongoCards) {
    return mongoCards.map((card) => ({
      id: parseInt(card.cardId),
      english: card.front,
      spanish: card.back,
      exampleEnglish: card.exampleFront,
      exampleSpanish: card.exampleBack,
      image: card.image ?? card.imageUrl ?? null,
      dueDate: card.sm2.nextReviewDate.toISOString().split("T")[0],
      interval: card.sm2.interval,
      easinessFactor: card.sm2.easeFactor,
      repetitions: card.sm2.repetitions,
      lastReviewed: card.sm2.lastReviewed?.toISOString() || null
    }));
  }
  convertLocalFlashcardToMongo(card, userId) {
    return {
      cardId: card.id.toString(),
      userId,
      front: card.english,
      back: card.spanish,
      exampleFront: card.exampleEnglish,
      exampleBack: card.exampleSpanish,
      image: card.image,
      category: "general",
      difficulty: "medium",
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
        lastDifficulty: "medium"
      }
    };
  }
  convertMongoSessionsToLocal(mongoSessions) {
    return mongoSessions.map((session) => ({
      id: session.sessionId,
      date: session.startTime instanceof Date ? session.startTime.toISOString() : new Date(session.startTime).toISOString(),
      cardsReviewed: typeof session.cardsReviewed === "number" ? session.cardsReviewed : Array.isArray(session.cardsStudied) ? session.cardsStudied.length : 0,
      correctAnswers: session.correctAnswers,
      totalTime: typeof session.duration === "number" ? session.duration : typeof session.totalTime === "number" ? session.totalTime : 0,
      averageResponseTime: session.averageResponseTime
    }));
  }
  convertLocalSessionToMongo(session, userId) {
    return {
      sessionId: session.id,
      userId,
      date: session.date,
      cardsReviewed: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
      totalTime: session.totalTime,
      averageResponseTime: session.averageResponseTime,
      mode: "mixed",
      difficulty: "medium",
      profileId: "default"
    };
  }
  convertMongoStatsToLocal(stats) {
    return {
      totalCards: Number(stats.totalCards) || 0,
      cardsMastered: Number(stats.matureCards) || 0,
      cardsInProgress: Number(stats.learningCards) || 0,
      cardsNew: Number(stats.newCards) || 0,
      currentStreak: 0,
      // Would need to calculate from session data
      longestStreak: 0,
      totalStudyTime: Number(stats.totalStudyTime) || 0,
      averageAccuracy: Number(stats.averageAccuracy) || 0,
      studySessionsToday: 0,
      studySessionsThisWeek: 0,
      studySessionsThisMonth: 0
    };
  }
  getDefaultProgressStats() {
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
  getSyncStatus() {
    return this.syncStatusStore.get();
  }
  getSyncStatusStore() {
    return this.syncStatusStore;
  }
  async forceSync(userId) {
    await this.performSync(userId);
  }
  clearCache() {
    this.cacheStores.flashcards.clear();
    this.cacheStores.studySessions.clear();
    this.cacheStores.progressStats.clear();
    this.cacheStores.studyProfiles.clear();
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    }
  }
  destroy() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    this.retryTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.retryTimeouts.clear();
  }
}
const hybridStorage = new HybridStorage();

const hybridStorage$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  HybridStorage,
  hybridStorage
}, Symbol.toStringTag, { value: 'Module' }));

map({
  isActive: false,
  isPaused: false,
  startTime: null,
  pauseTime: null,
  totalPausedTime: 0,
  cardsStudied: 0,
  correctAnswers: 0,
  currentBreakTime: 0,
  nextBreakTime: 0
});
const studyHistoryStore = atom([]);
const currentProfileStore = atom(null);
const progressStatsStore = atom({
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
});
atom(false);
atom(null);
hybridStorage.getSyncStatusStore();
const profileActions = {
  setCurrentProfile: (profile) => {
    currentProfileStore.set(profile);
  },
  updateProfile: (updates) => {
    const current = currentProfileStore.get();
    if (current) {
      currentProfileStore.set({
        ...current,
        ...updates,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
};

const userAtom = atom(null);
const tokensAtom = atom(null);
const isLoadingAtom = atom(true);
const errorAtom = atom(null);
const lastActivityAtom = atom(null);
const isAuthenticatedAtom = computed([userAtom, tokensAtom], (user, tokens) => {
  return !!(user && tokens && tokens.accessToken);
});
const authStateAtom = computed(
  [
    userAtom,
    tokensAtom,
    isAuthenticatedAtom,
    isLoadingAtom,
    errorAtom,
    lastActivityAtom
  ],
  (user, tokens, isAuthenticated, isLoading, error, lastActivity) => ({
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    lastActivity
  })
);
const setUser = (user) => {
  userAtom.set(user);
  lastActivityAtom.set(/* @__PURE__ */ new Date());
  if (user) {
    SecurityAuditor.logSecurityEvent(
      "USER_STATE_UPDATED",
      { userId: user.userId },
      "low"
    );
  }
};
const setTokens = (tokens) => {
  tokensAtom.set(tokens);
  lastActivityAtom.set(/* @__PURE__ */ new Date());
};
const setLoading = (isLoading) => {
  isLoadingAtom.set(isLoading);
};
const setError = (error) => {
  errorAtom.set(error);
  lastActivityAtom.set(/* @__PURE__ */ new Date());
};
const clearAuth = () => {
  userAtom.set(null);
  tokensAtom.set(null);
  errorAtom.set(null);
  lastActivityAtom.set(/* @__PURE__ */ new Date());
  SecurityAuditor.logSecurityEvent("AUTH_STATE_CLEARED", {}, "low");
};
const login = async (credentials) => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credentials)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const errorMessage = data.error || "Login failed";
      setError(errorMessage);
      setLoading(false);
      SecurityAuditor.logSecurityEvent(
        "LOGIN_FAILED",
        { email: credentials.email, error: errorMessage },
        "medium"
      );
      return false;
    }
    await SecureTokenStorage.storeAccessToken(
      data.data.accessToken,
      data.data.expiresIn / 1e3
    );
    SecureTokenStorage.storeRefreshTokenReference(data.data.refreshToken);
    setUser(data.data.user);
    setTokens({
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      expiresIn: data.data.expiresIn,
      tokenType: "Bearer"
    });
    setLoading(false);
    TokenRefreshManager.startAutoRefresh();
    SecurityAuditor.logSecurityEvent(
      "LOGIN_SUCCESS",
      { userId: data.data.user.userId, email: data.data.user.email },
      "low"
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    setError(errorMessage);
    setLoading(false);
    SecurityAuditor.logSecurityEvent(
      "LOGIN_ERROR",
      { error: errorMessage },
      "medium"
    );
    return false;
  }
};
const register = async (registerData) => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(registerData)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const errorMessage = data.error || "Registration failed";
      setError(errorMessage);
      setLoading(false);
      SecurityAuditor.logSecurityEvent(
        "REGISTRATION_FAILED",
        { email: registerData.email, error: errorMessage },
        "medium"
      );
      return false;
    }
    await SecureTokenStorage.storeAccessToken(
      data.data.tokens.accessToken,
      data.data.tokens.expiresIn / 1e3
    );
    SecureTokenStorage.storeRefreshTokenReference(
      data.data.tokens.refreshToken
    );
    setUser(data.data.user);
    setTokens(data.data.tokens);
    setLoading(false);
    TokenRefreshManager.startAutoRefresh();
    SecurityAuditor.logSecurityEvent(
      "REGISTRATION_SUCCESS",
      { userId: data.data.user.userId, email: data.data.user.email },
      "low"
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    setError(errorMessage);
    setLoading(false);
    SecurityAuditor.logSecurityEvent(
      "REGISTRATION_ERROR",
      { error: errorMessage },
      "medium"
    );
    return false;
  }
};
const logout = async () => {
  try {
    setLoading(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    SecureTokenStorage.clearTokens();
    TokenRefreshManager.stopAutoRefresh();
    clearAuth();
    setLoading(false);
    SecurityAuditor.logSecurityEvent("LOGOUT_SUCCESS", {}, "low");
  } catch (error) {
    console.error("Logout error:", error);
    SecureTokenStorage.clearTokens();
    TokenRefreshManager.stopAutoRefresh();
    clearAuth();
    setLoading(false);
    SecurityAuditor.logSecurityEvent(
      "LOGOUT_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      "medium"
    );
  }
};
const checkAuth = async () => {
  try {
    setLoading(true);
    setError(null);
    const isAuthenticated = await AuthStateManager.checkAuthentication();
    if (isAuthenticated) {
      const token = await SecureTokenStorage.getAccessToken();
      if (token) {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
          const timeUntilExpiry = SecureTokenStorage.getTimeUntilExpiry();
          setTokens({
            accessToken: token,
            refreshToken: "",
            // We don't store refresh token in memory
            expiresIn: timeUntilExpiry,
            tokenType: "Bearer"
          });
        }
      }
    } else {
      clearAuth();
    }
    setLoading(false);
  } catch (error) {
    console.error("Auth check error:", error);
    clearAuth();
    setLoading(false);
  }
};
const initializeAuthStore = async () => {
  await checkAuth();
  const unsubscribe = AuthStateManager.subscribe((isAuthenticated) => {
    if (!isAuthenticated) {
      clearAuth();
    }
  });
  return unsubscribe;
};

const dashboardStatsStore = atom(null);
const dashboardActivityStore = atom(null);
const dashboardProgressStore = atom(null);
const dashboardLoadingStore = map({
  stats: false,
  activity: false,
  progress: false
});
const dashboardErrorStore = map({
  stats: null,
  activity: null,
  progress: null
});
computed(
  dashboardLoadingStore,
  (loading) => loading.stats || loading.activity || loading.progress
);
computed(
  dashboardErrorStore,
  (errors) => Object.values(errors).filter(Boolean)
);
const fetchDashboardStats = async () => {
  dashboardLoadingStore.setKey("stats", true);
  dashboardErrorStore.setKey("stats", null);
  try {
    const response = await fetch("/api/dashboard/stats");
    const result = await response.json();
    if (result.success) {
      dashboardStatsStore.set(result.data);
    } else {
      throw new Error(result.error || "Failed to fetch dashboard stats");
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    dashboardErrorStore.setKey(
      "stats",
      error instanceof Error ? error.message : "Unknown error"
    );
  } finally {
    dashboardLoadingStore.setKey("stats", false);
  }
};
const fetchDashboardActivity = async (limit = 10, offset = 0) => {
  dashboardLoadingStore.setKey("activity", true);
  dashboardErrorStore.setKey("activity", null);
  try {
    const response = await fetch(
      `/api/dashboard/activity?limit=${limit}&offset=${offset}`
    );
    const result = await response.json();
    if (result.success) {
      dashboardActivityStore.set(result.data);
    } else {
      throw new Error(result.error || "Failed to fetch dashboard activity");
    }
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    dashboardErrorStore.setKey(
      "activity",
      error instanceof Error ? error.message : "Unknown error"
    );
  } finally {
    dashboardLoadingStore.setKey("activity", false);
  }
};
const fetchDashboardProgress = async (days = 30, type = "daily") => {
  dashboardLoadingStore.setKey("progress", true);
  dashboardErrorStore.setKey("progress", null);
  try {
    const response = await fetch(
      `/api/dashboard/progress?days=${days}&type=${type}`
    );
    const result = await response.json();
    if (result.success) {
      dashboardProgressStore.set(result.data);
    } else {
      throw new Error(result.error || "Failed to fetch dashboard progress");
    }
  } catch (error) {
    console.error("Error fetching dashboard progress:", error);
    dashboardErrorStore.setKey(
      "progress",
      error instanceof Error ? error.message : "Unknown error"
    );
  } finally {
    dashboardLoadingStore.setKey("progress", false);
  }
};
const fetchAllDashboardData = async () => {
  await Promise.all([
    fetchDashboardStats(),
    fetchDashboardActivity(5),
    // Fetch recent 5 activities
    fetchDashboardProgress(30, "daily")
    // Fetch last 30 days
  ]);
};

const StatsOverview = ({
  flashcards,
  progressStats,
  studyHistory,
  dashboardStats,
  loading = false
}) => {
  const getStats = () => {
    if (dashboardStats) {
      return {
        totalCards: dashboardStats.totalCards,
        masteredCards: dashboardStats.masteredCards,
        currentStreak: dashboardStats.currentStreak,
        todayStudyTime: dashboardStats.todayStudyTime
      };
    }
    const today = (/* @__PURE__ */ new Date()).toDateString();
    const todaySessions = studyHistory.filter(
      (session) => new Date(session.date).toDateString() === today
    );
    const todayStudyTime = todaySessions.reduce(
      (sum, session) => sum + session.totalTime,
      0
    );
    const masteredCards = flashcards.filter(
      (card) => card.easinessFactor >= 2.5 && card.repetitions >= 3
    ).length;
    return {
      totalCards: flashcards.length,
      masteredCards,
      currentStreak: progressStats.currentStreak,
      todayStudyTime
    };
  };
  const statsData = getStats();
  const statCards = [
    {
      title: "Total de Tarjetas",
      value: statsData.totalCards,
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-6 w-6",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            }
          )
        }
      ),
      color: "primary",
      bgColor: "bg-primary-100 dark:bg-primary-900",
      textColor: "text-primary-600 dark:text-primary-400"
    },
    {
      title: "Tarjetas Dominadas",
      value: statsData.masteredCards,
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-6 w-6",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            }
          )
        }
      ),
      color: "success",
      bgColor: "bg-success-100 dark:bg-success-900",
      textColor: "text-success-600 dark:text-success-400"
    },
    {
      title: "Racha Actual",
      value: statsData.currentStreak,
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-6 w-6",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M13 10V3L4 14h7v7l9-11h-7z"
            }
          )
        }
      ),
      color: "accent",
      bgColor: "bg-accent-100 dark:bg-accent-900",
      textColor: "text-accent-600 dark:text-accent-400"
    },
    {
      title: "Tiempo Hoy",
      value: `${statsData.todayStudyTime}m`,
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-6 w-6",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            }
          )
        }
      ),
      color: "secondary",
      bgColor: "bg-secondary-100 dark:bg-secondary-900",
      textColor: "text-secondary-600 dark:text-secondary-400"
    }
  ];
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4", children: statCards.map((stat, index) => /* @__PURE__ */ jsx(
    "div",
    {
      className: "rounded-xl border border-neutral-200 bg-white p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl dark:border-gray-600 dark:bg-gray-800",
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-neutral-600 dark:text-neutral-300", children: stat.title }),
          loading ? /* @__PURE__ */ jsx("div", { className: "h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" }) : /* @__PURE__ */ jsx(
            "p",
            {
              className: `text-2xl font-bold text-neutral-900 dark:text-neutral-100`,
              children: stat.value
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: `h-12 w-12 ${stat.bgColor} flex items-center justify-center rounded-lg`,
            children: /* @__PURE__ */ jsx("div", { className: stat.textColor, children: stat.icon })
          }
        )
      ] })
    },
    index
  )) });
};

const StudyHeatmap = ({
  studySessions,
  months = 12
}) => {
  const generateDateRange = (monthsBack) => {
    const dates = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = monthsBack * 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  };
  const createStudyDataMap = (sessions) => {
    const dataMap = {};
    sessions.forEach((session) => {
      const date = session.date;
      dataMap[date] = (dataMap[date] || 0) + session.totalTime;
    });
    return dataMap;
  };
  const getIntensityLevel = (minutes) => {
    if (minutes === 0) return 0;
    if (minutes < 15) return 1;
    if (minutes < 30) return 2;
    if (minutes < 60) return 3;
    return 4;
  };
  const getColorClass = (level) => {
    const colors = [
      "bg-gray-100",
      // No study
      "bg-green-200",
      // Light
      "bg-green-300",
      // Moderate
      "bg-green-400",
      // Heavy
      "bg-green-500"
      // Very heavy
    ];
    return colors[level];
  };
  const getMonthLabels = () => {
    const monthLabels2 = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthLabels2.push(date.toLocaleDateString("en-US", { month: "short" }));
    }
    return monthLabels2;
  };
  const getDayLabels = () => {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  };
  const dateRange = generateDateRange(months);
  const studyDataMap = createStudyDataMap(studySessions);
  const monthLabels = getMonthLabels();
  const dayLabels = getDayLabels();
  const weeks = [];
  let currentWeek = [];
  dateRange.forEach((date, index) => {
    const dayOfWeek = new Date(date).getDay();
    currentWeek.push(date);
    if (dayOfWeek === 6 || index === dateRange.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  const totalStudyTime = Object.values(studyDataMap).reduce(
    (sum, time) => sum + time,
    0
  );
  const studyDays = Object.keys(studyDataMap).length;
  const averageDailyTime = studyDays > 0 ? totalStudyTime / studyDays : 0;
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-white p-6 shadow-lg", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Study Consistency" }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600", children: [
          "Your study activity over the past ",
          months,
          " months"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold text-green-600", children: [
          Math.round(totalStudyTime),
          "m"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-500", children: "Total study time" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-6 grid grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-blue-50 p-3 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "text-lg font-semibold text-blue-600", children: studyDays }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Study Days" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-green-50 p-3 text-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-lg font-semibold text-green-600", children: [
          Math.round(averageDailyTime),
          "m"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Daily Average" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-purple-50 p-3 text-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-lg font-semibold text-purple-600", children: [
          studyDays > 0 ? Math.round(studyDays / (months * 30) * 100) : 0,
          "%"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Consistency" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "overflow-x-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "inline-flex", children: [
        /* @__PURE__ */ jsx("div", { className: "flex flex-col justify-around pr-2 text-xs text-gray-500", children: dayLabels.map((day, index) => /* @__PURE__ */ jsx("div", { className: "flex h-3 items-center", children: index % 2 === 0 ? day : "" }, day)) }),
        /* @__PURE__ */ jsx("div", { className: "flex space-x-1", children: weeks.map((week, weekIndex) => /* @__PURE__ */ jsx("div", { className: "flex flex-col space-y-1", children: week.map((date) => {
          const studyTime = studyDataMap[date] || 0;
          const intensityLevel = getIntensityLevel(studyTime);
          const colorClass = getColorClass(intensityLevel);
          return /* @__PURE__ */ jsx(
            "div",
            {
              className: `h-3 w-3 rounded-sm ${colorClass} cursor-pointer border border-gray-200 transition-all hover:ring-2 hover:ring-blue-300`,
              title: `${date}: ${studyTime > 0 ? `${studyTime} minutes` : "No study"}`
            },
            date
          );
        }) }, weekIndex)) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 flex pl-8", children: monthLabels.map((month) => /* @__PURE__ */ jsx(
        "div",
        {
          className: "text-xs text-gray-500",
          style: { width: `${100 / monthLabels.length}%` },
          children: month
        },
        month
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center justify-between border-t border-gray-200 pt-4", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600", children: "Less" }),
      /* @__PURE__ */ jsx("div", { className: "flex space-x-1", children: [0, 1, 2, 3, 4].map((level) => /* @__PURE__ */ jsx(
        "div",
        {
          className: `h-3 w-3 rounded-sm ${getColorClass(level)} border border-gray-200`,
          title: level === 0 ? "No study" : level === 1 ? "< 15 min" : level === 2 ? "15-30 min" : level === 3 ? "30-60 min" : "> 60 min"
        },
        level
      )) }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600", children: "More" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-lg bg-gray-50 p-4", children: [
      /* @__PURE__ */ jsx("h4", { className: "mb-2 text-sm font-semibold text-gray-900", children: "Study Insights" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-1 text-sm text-gray-600", children: studyDays === 0 ? /* @__PURE__ */ jsx("p", { children: "Start studying to see your consistency pattern!" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("p", { children: [
          "You've studied on ",
          /* @__PURE__ */ jsx("strong", { children: studyDays }),
          " days in the past ",
          months,
          " months."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          "Your average daily study time is",
          " ",
          /* @__PURE__ */ jsxs("strong", { children: [
            Math.round(averageDailyTime),
            " minutes"
          ] }),
          "."
        ] }),
        /* @__PURE__ */ jsx("p", { children: averageDailyTime < 15 ? "Consider increasing your daily study time for better retention." : averageDailyTime > 60 ? "Great job maintaining consistent long study sessions!" : "Your study time looks balanced and consistent." })
      ] }) })
    ] })
  ] });
};

const RecentActivity = ({
  studyHistory,
  maxItems = 5
}) => {
  const recentSessions = studyHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, maxItems);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = /* @__PURE__ */ new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short"
      });
    }
  };
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return "text-success-600 dark:text-success-400";
    if (accuracy >= 60) return "text-warning-600 dark:text-warning-400";
    return "text-error-600 dark:text-error-400";
  };
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-gray-600 dark:bg-gray-800", children: [
    /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100", children: "Actividad Reciente" }),
    recentSessions.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-8 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-2 text-neutral-500 dark:text-neutral-400", children: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "mx-auto mb-4 h-12 w-12 opacity-50",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            }
          )
        }
      ) }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-neutral-500 dark:text-neutral-400", children: "No hay sesiones de estudio recientes" }),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/study",
          className: "mt-4 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-700",
          children: "Comenzar a Estudiar"
        }
      )
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "space-y-4", children: recentSessions.map((session, index) => {
        const accuracy = Math.round(
          session.correctAnswers / session.cardsReviewed * 100
        );
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex items-center justify-between py-2",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900", children: /* @__PURE__ */ jsx(
                  "svg",
                  {
                    className: "h-4 w-4 text-primary-600 dark:text-primary-400",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                    children: /* @__PURE__ */ jsx(
                      "path",
                      {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: "2",
                        d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      }
                    )
                  }
                ) }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: [
                    session.cardsReviewed,
                    " tarjetas estudiadas"
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: formatDate(session.date) })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: [
                  session.totalTime,
                  "m"
                ] }),
                /* @__PURE__ */ jsxs("p", { className: `text-xs ${getAccuracyColor(accuracy)}`, children: [
                  accuracy,
                  "% precisión"
                ] })
              ] })
            ]
          },
          session.id || index
        );
      }) }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 border-t border-neutral-200 pt-4 dark:border-gray-600", children: /* @__PURE__ */ jsxs(
        "a",
        {
          href: "/study",
          className: "flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300",
          children: [
            "Ver todas las sesiones",
            /* @__PURE__ */ jsx(
              "svg",
              {
                className: "h-4 w-4",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: "2",
                    d: "M9 5l7 7-7 7"
                  }
                )
              }
            )
          ]
        }
      ) })
    ] })
  ] });
};

const ProgressChart = ({ studyHistory }) => {
  const getAccuracyByDifficulty = () => {
    const accuracyData = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    };
    studyHistory.forEach((session) => {
      const totalCards = session.cardsReviewed;
      const correctCards = session.correctAnswers;
      const easyCards = Math.floor(totalCards * 0.4);
      const mediumCards = Math.floor(totalCards * 0.4);
      const hardCards = totalCards - easyCards - mediumCards;
      const easyCorrect = Math.floor(correctCards * 0.5);
      const mediumCorrect = Math.floor(correctCards * 0.35);
      const hardCorrect = correctCards - easyCorrect - mediumCorrect;
      accuracyData.easy.correct += easyCorrect;
      accuracyData.easy.total += easyCards;
      accuracyData.medium.correct += mediumCorrect;
      accuracyData.medium.total += mediumCards;
      accuracyData.hard.correct += hardCorrect;
      accuracyData.hard.total += hardCards;
    });
    return {
      easy: accuracyData.easy.total > 0 ? Math.round(
        accuracyData.easy.correct / accuracyData.easy.total * 100
      ) : 0,
      medium: accuracyData.medium.total > 0 ? Math.round(
        accuracyData.medium.correct / accuracyData.medium.total * 100
      ) : 0,
      hard: accuracyData.hard.total > 0 ? Math.round(
        accuracyData.hard.correct / accuracyData.hard.total * 100
      ) : 0
    };
  };
  const accuracy = getAccuracyByDifficulty();
  const difficultyLevels = [
    {
      label: "Fácil",
      percentage: accuracy.easy,
      color: "bg-success-500",
      bgColor: "bg-success-200"
    },
    {
      label: "Medio",
      percentage: accuracy.medium,
      color: "bg-warning-500",
      bgColor: "bg-warning-200"
    },
    {
      label: "Difícil",
      percentage: accuracy.hard,
      color: "bg-error-500",
      bgColor: "bg-error-200"
    }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-gray-600 dark:bg-gray-800", children: [
    /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100", children: "Precisión por Dificultad" }),
    studyHistory.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-8 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-2 text-neutral-500 dark:text-neutral-400", children: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "mx-auto mb-4 h-12 w-12 opacity-50",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            }
          )
        }
      ) }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-neutral-500 dark:text-neutral-400", children: "Comienza a estudiar para ver tus estadísticas de precisión" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-4", children: difficultyLevels.map((level, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("span", { className: "min-w-[60px] text-sm text-neutral-600 dark:text-neutral-300", children: level.label }),
      /* @__PURE__ */ jsx("div", { className: "mx-4 flex-1", children: /* @__PURE__ */ jsx("div", { className: `w-full ${level.bgColor} h-2 rounded-full`, children: /* @__PURE__ */ jsx(
        "div",
        {
          className: `${level.color} h-2 rounded-full transition-all duration-500 ease-out`,
          style: { width: `${level.percentage}%` }
        }
      ) }) }),
      /* @__PURE__ */ jsxs("span", { className: "min-w-[45px] text-right text-sm font-medium text-neutral-900 dark:text-neutral-100", children: [
        level.percentage,
        "%"
      ] })
    ] }, index)) }),
    studyHistory.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-6 border-t border-neutral-200 pt-4 dark:border-gray-600", children: /* @__PURE__ */ jsxs("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: [
      /* @__PURE__ */ jsxs("p", { children: [
        "Basado en ",
        studyHistory.length,
        " sesiones de estudio"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "mt-1", children: [
        "Total de tarjetas revisadas:",
        " ",
        studyHistory.reduce(
          (sum, session) => sum + session.cardsReviewed,
          0
        )
      ] })
    ] }) })
  ] });
};

const StudyGoals = ({
  progressStats,
  studyHistory
}) => {
  const getTodayProgress = () => {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    const todaySessions = studyHistory.filter(
      (session) => new Date(session.date).toDateString() === today
    );
    const cardsToday2 = todaySessions.reduce(
      (sum, session) => sum + session.cardsReviewed,
      0
    );
    const timeToday2 = todaySessions.reduce(
      (sum, session) => sum + session.totalTime,
      0
    );
    return { cardsToday: cardsToday2, timeToday: timeToday2 };
  };
  const { cardsToday, timeToday } = getTodayProgress();
  const dailyCardGoal = 20;
  const dailyTimeGoal = 45;
  const cardProgress = Math.min(cardsToday / dailyCardGoal * 100, 100);
  const timeProgress = Math.min(timeToday / dailyTimeGoal * 100, 100);
  const CircularProgress = ({ percentage, color, size = 48 }) => {
    const radius = (size - 4) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${percentage / 100 * circumference} ${circumference}`;
    return /* @__PURE__ */ jsxs("div", { className: "relative", style: { width: size, height: size }, children: [
      /* @__PURE__ */ jsxs("svg", { width: size, height: size, className: "-rotate-90 transform", children: [
        /* @__PURE__ */ jsx(
          "circle",
          {
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: "none",
            stroke: "#e5e7eb",
            strokeWidth: "2",
            className: "dark:stroke-gray-600"
          }
        ),
        /* @__PURE__ */ jsx(
          "circle",
          {
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: "none",
            stroke: color,
            strokeWidth: "2",
            strokeDasharray,
            strokeLinecap: "round",
            className: "transition-all duration-500 ease-out"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxs("span", { className: "text-xs font-medium text-neutral-900 dark:text-neutral-100", children: [
        Math.round(percentage),
        "%"
      ] }) })
    ] });
  };
  const goals = [
    {
      title: "Tarjetas Diarias",
      current: cardsToday,
      target: dailyCardGoal,
      progress: cardProgress,
      color: "#3b82f6",
      unit: "tarjetas",
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-5 w-5",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            }
          )
        }
      )
    },
    {
      title: "Tiempo de Estudio",
      current: timeToday,
      target: dailyTimeGoal,
      progress: timeProgress,
      color: "#10b981",
      unit: "minutos",
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-5 w-5",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            }
          )
        }
      )
    }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-gray-600 dark:bg-gray-800", children: [
    /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100", children: "Metas de Estudio" }),
    /* @__PURE__ */ jsx("div", { className: "space-y-6", children: goals.map((goal, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700", children: /* @__PURE__ */ jsx("div", { className: "text-gray-600 dark:text-gray-400", children: goal.icon }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: goal.title }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
            goal.current,
            " de ",
            goal.target,
            " ",
            goal.unit
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(CircularProgress, { percentage: goal.progress, color: goal.color })
    ] }, index)) }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 border-t border-neutral-200 pt-4 dark:border-gray-600", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: "Racha Semanal" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
          progressStats.currentStreak,
          " días consecutivos"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx("div", { className: "text-lg font-bold text-accent-600 dark:text-accent-400", children: progressStats.currentStreak }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: "días" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "dark:from-primary-900/20 dark:to-accent-900/20 mt-4 rounded-lg bg-gradient-to-r from-primary-50 to-accent-50 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-neutral-700 dark:text-neutral-300", children: cardProgress >= 100 && timeProgress >= 100 ? "¡Excelente! Has cumplido todas tus metas de hoy 🎉" : cardProgress >= 100 ? "¡Meta de tarjetas cumplida! Sigue con el tiempo de estudio 💪" : timeProgress >= 100 ? "¡Meta de tiempo cumplida! Intenta revisar más tarjetas 📚" : cardProgress > 50 || timeProgress > 50 ? "¡Vas por buen camino! Sigue así 🚀" : "¡Comienza tu sesión de estudio para cumplir tus metas!" }) })
  ] });
};

const QuickActions = () => {
  const actions = [
    {
      href: "/study",
      title: "Continuar Estudiando",
      description: "Revisa tus flashcards",
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-5 w-5",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            }
          )
        }
      ),
      color: "primary",
      bgColor: "bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30",
      iconBg: "bg-primary-100 dark:bg-primary-900",
      iconColor: "text-primary-600 dark:text-primary-400"
    },
    {
      href: "/data",
      title: "Gestionar Datos",
      description: "Importar/exportar tarjetas",
      icon: /* @__PURE__ */ jsx(
        "svg",
        {
          className: "h-5 w-5",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "2",
              d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4"
            }
          )
        }
      ),
      color: "secondary",
      bgColor: "bg-secondary-50 hover:bg-secondary-100 dark:bg-secondary-900/20 dark:hover:bg-secondary-900/30",
      iconBg: "bg-secondary-100 dark:bg-secondary-900",
      iconColor: "text-secondary-600 dark:text-secondary-400"
    },
    {
      href: "/settings",
      title: "Configuración",
      description: "Personalizar experiencia",
      icon: /* @__PURE__ */ jsxs(
        "svg",
        {
          className: "h-5 w-5",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: [
            /* @__PURE__ */ jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              }
            ),
            /* @__PURE__ */ jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              }
            )
          ]
        }
      ),
      color: "accent",
      bgColor: "bg-accent-50 hover:bg-accent-100 dark:bg-accent-900/20 dark:hover:bg-accent-900/30",
      iconBg: "bg-accent-100 dark:bg-accent-900",
      iconColor: "text-accent-600 dark:text-accent-400"
    }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-gray-600 dark:bg-gray-800", children: [
    /* @__PURE__ */ jsx("h3", { className: "mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100", children: "Acciones Rápidas" }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-3", children: actions.map((action, index) => /* @__PURE__ */ jsxs(
      "a",
      {
        href: action.href,
        className: `flex items-center gap-3 p-4 ${action.bgColor} group rounded-lg transition-colors duration-200`,
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: `h-10 w-10 ${action.iconBg} flex items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110`,
              children: /* @__PURE__ */ jsx("div", { className: action.iconColor, children: action.icon })
            }
          ),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium text-neutral-900 dark:text-neutral-100", children: action.title }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: action.description })
          ] })
        ]
      },
      index
    )) }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 border-t border-neutral-200 pt-4 dark:border-gray-600", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 text-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-gray-50 p-3 dark:bg-gray-700", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-1 text-xs text-neutral-600 dark:text-neutral-400", children: "Próxima revisión" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: "En 2 horas" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-gray-50 p-3 dark:bg-gray-700", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-1 text-xs text-neutral-600 dark:text-neutral-400", children: "Tarjetas pendientes" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: "12 tarjetas" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsxs(
      "a",
      {
        href: "/study",
        className: "flex w-full transform items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl",
        children: [
          /* @__PURE__ */ jsx(
            "svg",
            {
              className: "h-5 w-5",
              fill: "none",
              stroke: "currentColor",
              viewBox: "0 0 24 24",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M13 7l5 5m0 0l-5 5m5-5H6"
                }
              )
            }
          ),
          "Comenzar Sesión de Estudio"
        ]
      }
    ) })
  ] });
};

const DashboardLayout = ({
  className = ""
}) => {
  const studyHistory = useStore(studyHistoryStore);
  const progressStats = useStore(progressStatsStore);
  const flashcards = useStore(flashcardsStore);
  const dashboardStats = useStore(dashboardStatsStore);
  const dashboardActivity = useStore(dashboardActivityStore);
  const dashboardProgress = useStore(dashboardProgressStore);
  const loading = useStore(dashboardLoadingStore);
  useEffect(() => {
    if (studyHistory.length === 0) {
      const sampleSessions = [
        {
          id: "session_1",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
          cardsReviewed: 15,
          correctAnswers: 12,
          totalTime: 25,
          averageResponseTime: 3.5
        },
        {
          id: "session_2",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
          cardsReviewed: 20,
          correctAnswers: 18,
          totalTime: 35,
          averageResponseTime: 2.8
        },
        {
          id: "session_3",
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          cardsReviewed: 10,
          correctAnswers: 9,
          totalTime: 18,
          averageResponseTime: 4.2
        }
      ];
      studyHistoryStore.set(sampleSessions);
    }
    fetchAllDashboardData().catch(console.error);
  }, [studyHistory.length]);
  if (loading.stats && !dashboardStats) {
    return /* @__PURE__ */ jsx("div", { className: `mx-auto max-w-7xl ${className}`, children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-12", children: [
      /* @__PURE__ */ jsx("div", { className: "h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" }),
      /* @__PURE__ */ jsx("span", { className: "ml-3 text-neutral-600 dark:text-neutral-300", children: "Cargando dashboard..." })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: `mx-auto max-w-7xl ${className}`, children: [
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsx(
      StatsOverview,
      {
        flashcards,
        progressStats,
        studyHistory,
        dashboardStats,
        loading: loading.stats
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsx("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsx(StudyHeatmap, { studySessions: studyHistory, months: 6 }) }),
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
        RecentActivity,
        {
          studyHistory,
          dashboardActivity,
          loading: loading.activity
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
        ProgressChart,
        {
          studyHistory,
          dashboardProgress,
          loading: loading.progress
        }
      ) }),
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
        StudyGoals,
        {
          progressStats,
          studyHistory,
          dashboardStats,
          loading: loading.stats
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsx(QuickActions, { dashboardStats }) })
  ] });
};

const getSizeClasses = (size) => {
  switch (size) {
    case "sm":
      return "w-8 h-8 text-sm";
    case "md":
      return "w-10 h-10 text-base";
    case "lg":
      return "w-12 h-12 text-lg";
    default:
      return "w-10 h-10 text-base";
  }
};
const ThemeToggle = ({
  size = "md",
  variant = "button",
  className = ""
}) => {
  const { theme, actualTheme, toggleTheme, isDark, mounted } = useTheme();
  if (!mounted) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: `${getSizeClasses(size)} animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700`
      }
    );
  }
  const getIcon = () => {
    if (theme === "auto") {
      return "🌓";
    }
    return isDark ? "🌙" : "☀️";
  };
  const getLabel = () => {
    if (theme === "auto") {
      return `Tema automático (${actualTheme === "dark" ? "oscuro" : "claro"})`;
    }
    return `Cambiar a tema ${isDark ? "claro" : "oscuro"}`;
  };
  if (variant === "minimal") {
    return /* @__PURE__ */ jsx(
      "button",
      {
        onClick: toggleTheme,
        className: ` ${getSizeClasses(size)} flex items-center justify-center rounded-full bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-800 dark:hover:bg-gray-700 ${className} `,
        "aria-label": getLabel(),
        title: getLabel(),
        suppressHydrationWarning: true,
        children: /* @__PURE__ */ jsx("span", { className: "text-lg", role: "img", "aria-hidden": "true", children: getIcon() })
      }
    );
  }
  if (variant === "icon") {
    return /* @__PURE__ */ jsx(
      "button",
      {
        onClick: toggleTheme,
        className: ` ${getSizeClasses(size)} flex items-center justify-center rounded-lg border border-gray-300 bg-gray-100 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 ${className} `,
        "aria-label": getLabel(),
        title: getLabel(),
        suppressHydrationWarning: true,
        children: /* @__PURE__ */ jsx("span", { className: "text-xl", role: "img", "aria-hidden": "true", children: getIcon() })
      }
    );
  }
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: toggleTheme,
      className: ` ${getSizeClasses(size)} flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${className} `,
      "aria-label": getLabel(),
      title: getLabel(),
      suppressHydrationWarning: true,
      children: [
        /* @__PURE__ */ jsx("span", { className: "text-lg", role: "img", "aria-hidden": "true", children: getIcon() }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: theme === "auto" ? "Auto" : isDark ? "Oscuro" : "Claro" })
      ]
    }
  );
};

const $$Astro$1 = createAstro();
const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Header;
  const { isSidebarOpen } = Astro2.props;
  const navigationItems = [
    { href: "#", label: "Dashboard", isActive: false },
    { href: "#", label: "Study", isActive: true },
    { href: "#", label: "Progress", isActive: false },
    { href: "#", label: "Settings", isActive: false }
  ];
  const quickActions = [
    {
      id: "help-button",
      title: "Help",
      iconPath: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    {
      id: "notifications-button",
      title: "Notifications",
      iconPath: "M15 17h5l-5 5v-5zM15 17H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2z"
    }
  ];
  const userMenuItems = [
    { href: "#", label: "Profile Settings" },
    { href: "#", label: "Study Statistics" },
    { href: "#", label: "Help & Support" },
    { href: "#", label: "Sign Out", isDivider: true }
  ];
  const BASE_TRANSITION = "transition-colors duration-200";
  const FOCUS_CLASSES = "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500";
  const NAV_LINK_BASE_CLASSES = "px-3 py-2 text-sm font-medium";
  const NAV_LINK_INACTIVE_CLASSES = `${NAV_LINK_BASE_CLASSES} ${BASE_TRANSITION} text-neutral-700 hover:text-primary-600`;
  const NAV_LINK_ACTIVE_CLASSES = `${NAV_LINK_BASE_CLASSES} ${BASE_TRANSITION} text-primary-600 border-b-2 border-primary-600`;
  const BUTTON_BASE_CLASSES = "p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md";
  const BUTTON_CLASSES = `${BUTTON_BASE_CLASSES} ${BASE_TRANSITION} ${FOCUS_CLASSES}`;
  const SIDEBAR_TOGGLE_CLASSES = "md:hidden touch-target p-3 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 touch-feedback";
  const USER_MENU_BUTTON_CLASSES = "flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100";
  const USER_MENU_CLASSES = `${USER_MENU_BUTTON_CLASSES} ${BASE_TRANSITION} ${FOCUS_CLASSES}`;
  const DROPDOWN_MENU_CLASSES = "absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-neutral-200 hidden";
  const DROPDOWN_ITEM_CLASSES = "block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100";
  return renderTemplate`${maybeRenderHead()}<header class="mobile-header"> <div class="px-mobile mx-auto max-w-7xl"> <div class="flex h-16 items-center justify-between"> <!-- Left Section: Logo and Mobile Menu --> <div class="flex items-center"> <button id="sidebar-toggle"${addAttribute(`${SIDEBAR_TOGGLE_CLASSES} ${FOCUS_CLASSES}`, "class")} aria-label="Toggle sidebar"${addAttribute(isSidebarOpen ? "true" : "false", "aria-expanded")}> <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> ${isSidebarOpen && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round"${addAttribute(2, "stroke-width")} d="M6 18L18 6M6 6l12 12"></path>`} ${!isSidebarOpen && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round"${addAttribute(2, "stroke-width")} d="M4 6h16M4 12h16M4 18h16"></path>`} </svg> </button> <div class="ml-4 flex items-center md:ml-0"> <div class="flex-shrink-0"> <h1 class="text-gradient-primary text-xl font-bold">LinguaFlip</h1> </div> </div> </div> <!-- Center Section: Navigation Menu --> <nav class="hidden space-x-8 md:flex" role="navigation" aria-label="Main navigation"> ${navigationItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(
    item.isActive ? NAV_LINK_ACTIVE_CLASSES : NAV_LINK_INACTIVE_CLASSES,
    "class"
  )}${addAttribute(item.isActive ? "page" : void 0, "aria-current")}> ${item.label} </a>`)} </nav> <!-- Right Section: Quick Actions and User Menu --> <div class="flex items-center space-x-4"> <!-- Quick Actions --> <div class="hidden items-center space-x-2 sm:flex" role="toolbar" aria-label="Quick actions"> ${quickActions.map((action) => renderTemplate`<button${addAttribute(action.id, "id")}${addAttribute(BUTTON_CLASSES, "class")}${addAttribute(action.title, "title")}${addAttribute(action.title, "aria-label")}> <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path stroke-linecap="round" stroke-linejoin="round"${addAttribute(2, "stroke-width")}${addAttribute(action.iconPath, "d")}></path> </svg> </button>`)} </div> <!-- User Menu --> <div class="relative" id="user-menu-container"> <button id="user-menu-button"${addAttribute(USER_MENU_CLASSES, "class")} aria-expanded="false" aria-haspopup="true" aria-controls="user-dropdown-menu"> <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-white">
U
</div> <svg class="h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path stroke-linecap="round" stroke-linejoin="round"${addAttribute(2, "stroke-width")} d="M19 9l-7 7-7-7"></path> </svg> </button> <!-- User Dropdown Menu --> <div id="user-dropdown-menu"${addAttribute(DROPDOWN_MENU_CLASSES, "class")} role="menu" aria-labelledby="user-menu-button"> <div class="border-b border-neutral-200 px-4 py-2"> <p class="text-sm font-medium text-neutral-900">User</p> <p class="text-xs text-neutral-500">user@example.com</p> </div> ${userMenuItems.map(
    (item) => item.isDivider ? renderTemplate`<div class="border-t border-neutral-200"></div>` : renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(DROPDOWN_ITEM_CLASSES, "class")} role="menuitem"> ${item.label} </a>`
  )} </div> </div> </div> </div> </div> </header> ${renderScript($$result, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/Header.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/Header.astro", void 0);

const $$Astro = createAstro();
const $$Sidebar = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Sidebar;
  const currentPath = Astro2.url.pathname;
  return renderTemplate`${maybeRenderHead()}<div class="fixed inset-y-0 left-0 z-50 w-64 transform border-r border-neutral-200 bg-white transition-transform duration-300 ease-in-out md:static md:inset-0 md:translate-x-0" data-sidebar> <div class="flex h-full flex-col"> <!-- Header --> <div class="flex items-center justify-between border-b border-neutral-200 p-4"> <h2 class="text-lg font-semibold text-neutral-900">Navigation</h2> </div> <!-- Navigation --> <nav class="flex-1 space-y-2 px-4 py-6"> <a href="/dashboard"${addAttribute(`w-full flex items-center px-4 py-4 text-base font-medium rounded-lg transition-colors duration-200 ${currentPath === "/dashboard" || currentPath.startsWith("/dashboard") ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"}`, "class")}> <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path> </svg>
Dashboard
</a> <a href="/study"${addAttribute(`w-full flex items-center px-4 py-4 text-base font-medium rounded-lg transition-colors duration-200 ${currentPath === "/study" || currentPath.startsWith("/study") ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"}`, "class")}> <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path> </svg>
Estudiar
</a> <a href="/data"${addAttribute(`w-full flex items-center px-4 py-4 text-base font-medium rounded-lg transition-colors duration-200 ${currentPath === "/data" || currentPath.startsWith("/data") ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"}`, "class")}> <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg>
Datos
</a> <a href="/settings"${addAttribute(`w-full flex items-center px-4 py-4 text-base font-medium rounded-lg transition-colors duration-200 ${currentPath === "/settings" || currentPath.startsWith("/settings") ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"}`, "class")}> <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path> </svg>
Configuración
</a> </nav> </div> </div>`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/Sidebar.astro", void 0);

const AuthContext = createContext(null);
const AuthProvider = ({ children }) => {
  const authState = useStore(authStateAtom);
  const initializeAuth = async () => {
    try {
      await initializeAuthStore();
    } catch (error) {
      console.error("Failed to initialize auth:", error);
    }
  };
  const loadUserFlashcards = async () => {
    if (authState.user?.userId) {
      try {
        setCurrentUser(authState.user.userId);
        await flashcardsActions.loadFlashcards(authState.user.userId);
      } catch (error) {
        console.error("Failed to load user flashcards:", error);
      }
    }
  };
  useEffect(() => {
    initializeAuth();
  }, []);
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      loadUserFlashcards();
    }
  }, [authState.isAuthenticated, authState.user?.userId]);
  const contextValue = {
    ...authState,
    initializeAuth,
    loadUserFlashcards
  };
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value: contextValue, children });
};
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    if (typeof window === "undefined") {
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
        lastActivity: null,
        initializeAuth: async () => {
        },
        loadUserFlashcards: async () => {
        }
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const LoadingSpinner = ({
  size = "md",
  color = "primary",
  className = "",
  text,
  fullScreen = false,
  overlay = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-4 h-4";
      case "md":
        return "w-6 h-6";
      case "lg":
        return "w-8 h-8";
      case "xl":
        return "w-12 h-12";
      default:
        return "w-6 h-6";
    }
  };
  const getColorClasses = () => {
    switch (color) {
      case "primary":
        return "text-primary-500";
      case "secondary":
        return "text-secondary-500";
      case "gray":
        return "text-gray-500";
      case "white":
        return "text-white";
      default:
        return "text-primary-500";
    }
  };
  const spinner = /* @__PURE__ */ jsxs(
    "div",
    {
      className: `inline-flex flex-col items-center justify-center ${className}`,
      children: [
        /* @__PURE__ */ jsxs(
          "svg",
          {
            className: `animate-spin ${getSizeClasses()} ${getColorClasses()}`,
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "aria-hidden": "true",
            children: [
              /* @__PURE__ */ jsx(
                "circle",
                {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }
              ),
              /* @__PURE__ */ jsx(
                "path",
                {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                }
              )
            ]
          }
        ),
        text && /* @__PURE__ */ jsx(
          "span",
          {
            className: `mt-2 text-sm font-medium ${getColorClasses()}`,
            "aria-live": "polite",
            children: text
          }
        )
      ]
    }
  );
  if (fullScreen) {
    return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80", children: spinner });
  }
  if (overlay) {
    return /* @__PURE__ */ jsx("div", { className: "absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-sm dark:bg-gray-900/60", children: spinner });
  }
  return spinner;
};

const AuthModal = ({
  isOpen,
  onClose,
  initialMode = "login",
  onSuccess
}) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: ""
  });
  const isLoading = useStore(isLoadingAtom);
  const error = useStore(errorAtom);
  const isAuthenticated = useStore(isAuthenticatedAtom);
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onSuccess?.();
      onClose();
      window.dispatchEvent(new CustomEvent("auth-success"));
    }
  }, [isAuthenticated, isOpen, onSuccess, onClose]);
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      username: ""
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "register") {
      if (formData.password !== formData.confirmPassword) {
        return;
      }
      await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        username: formData.username || void 0
      });
    } else {
      await login({
        email: formData.email,
        password: formData.password,
        deviceInfo: navigator.userAgent
      });
    }
  };
  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  const toggleMode = () => {
    setMode((prev) => prev === "login" ? "register" : "login");
    resetForm();
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: onClose,
        className: "absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200",
        "aria-label": "Cerrar modal",
        children: /* @__PURE__ */ jsx(
          "svg",
          {
            className: "h-6 w-6",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /* @__PURE__ */ jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M6 18L18 6M6 6l12 12"
              }
            )
          }
        )
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 text-center", children: [
        /* @__PURE__ */ jsx("h2", { className: "mb-2 text-3xl font-bold text-gray-900 dark:text-white", children: mode === "login" ? "Iniciar Sesión" : "Crear Cuenta" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-300", children: mode === "login" ? "Accede a tus flashcards personalizadas" : "Únete y comienza a aprender inglés" })
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/50", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-800 dark:text-red-200", children: error }) }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
        mode === "register" && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "auth-username",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Nombre de usuario (opcional)"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              name: "username",
              id: "auth-username",
              value: formData.username,
              onChange: handleInputChange,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "Tu nombre de usuario"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "auth-email",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Correo electrónico"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "email",
              name: "email",
              id: "auth-email",
              value: formData.email,
              onChange: handleInputChange,
              required: true,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "tu@email.com"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "auth-password",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Contraseña"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              name: "password",
              id: "auth-password",
              value: formData.password,
              onChange: handleInputChange,
              required: true,
              minLength: 8,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "••••••••"
            }
          ),
          mode === "register" && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: "Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números" })
        ] }),
        mode === "register" && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "auth-confirm-password",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Confirmar contraseña"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              name: "confirmPassword",
              id: "auth-confirm-password",
              value: formData.confirmPassword,
              onChange: handleInputChange,
              required: true,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "••••••••"
            }
          ),
          formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-red-500", children: "Las contraseñas no coinciden" })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: isLoading || mode === "register" && formData.password !== formData.confirmPassword,
            className: "flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-primary-400",
            children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(LoadingSpinner, { size: "sm", color: "white", className: "mr-2" }),
              mode === "login" ? "Iniciando sesión..." : "Creando cuenta..."
            ] }) : mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 text-center", children: /* @__PURE__ */ jsxs("p", { className: "text-gray-600 dark:text-gray-300", children: [
        mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?",
        " ",
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: toggleMode,
            className: "font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300",
            children: mode === "login" ? "Crear una cuenta" : "Iniciar sesión"
          }
        )
      ] }) })
    ] })
  ] }) });
};

const UserProfile = ({ className = "" }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState(
    "login"
  );
  React.useEffect(() => {
    const handleOpenAuthModal = (event) => {
      const mode = event.detail?.mode || "login";
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
    };
    window.addEventListener("open-auth-modal", handleOpenAuthModal);
    return () => {
      window.removeEventListener("open-auth-modal", handleOpenAuthModal);
    };
  }, []);
  const handleLogin = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };
  const handleRegister = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };
  const handleLogout = async () => {
    await logout();
  };
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: `flex items-center justify-center ${className}`, children: /* @__PURE__ */ jsx(LoadingSpinner, { size: "sm", color: "primary" }) });
  }
  if (isAuthenticated && user) {
    return /* @__PURE__ */ jsxs("div", { className: `flex items-center space-x-3 ${className}`, children: [
      /* @__PURE__ */ jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-800", children: /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-primary-600 dark:text-primary-300", children: user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U" }) }),
      /* @__PURE__ */ jsxs("div", { className: "hidden sm:block", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: user.username || user.email?.split("@")[0] || "Usuario" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: [
          user.statistics?.totalCardsStudied || 0,
          " tarjetas estudiadas"
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleLogout,
          className: "rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200",
          "aria-label": "Cerrar sesión",
          children: /* @__PURE__ */ jsx(
            "svg",
            {
              className: "h-5 w-5",
              fill: "none",
              stroke: "currentColor",
              viewBox: "0 0 24 24",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: 2,
                  d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                }
              )
            }
          )
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: `flex items-center space-x-2 ${className}`, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleLogin,
          className: "text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300",
          children: "Iniciar Sesión"
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "text-gray-300 dark:text-gray-600", children: "|" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleRegister,
          className: "rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700",
          children: "Registrarse"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      AuthModal,
      {
        isOpen: isAuthModalOpen,
        onClose: () => setIsAuthModalOpen(false),
        initialMode: authModalMode,
        onSuccess: handleAuthSuccess
      }
    )
  ] });
};

const AuthenticatedApp = ({
  children,
  showUserProfile = true,
  showCreateButton = true
}) => {
  return /* @__PURE__ */ jsxs(AuthProvider, { children: [
    children,
    showUserProfile && /* @__PURE__ */ jsx("div", { className: "fixed right-16 top-0 z-50 flex h-16 items-center px-4", children: /* @__PURE__ */ jsx(UserProfile, {}) }),
    showCreateButton && /* @__PURE__ */ jsx(CreateFlashcardButton, {})
  ] });
};

const RecallQualityControls = ({
  onRate
}) => {
  const qualityButtons = [
    {
      label: "Again",
      quality: 0 /* AGAIN */,
      color: "bg-red-500 hover:bg-red-600",
      textColor: "text-white"
    },
    {
      label: "Hard",
      quality: 1 /* HARD */,
      color: "bg-orange-500 hover:bg-orange-600",
      textColor: "text-white"
    },
    {
      label: "Good",
      quality: 2 /* GOOD */,
      color: "bg-yellow-500 hover:bg-yellow-600",
      textColor: "text-white"
    },
    {
      label: "Easy",
      quality: 3 /* EASY */,
      color: "bg-green-500 hover:bg-green-600",
      textColor: "text-white"
    }
  ];
  const handleRate = (quality) => {
    if (typeof onRate === "function") {
      onRate(quality);
    } else if (typeof onRate === "string") {
      const globalFn = window[onRate];
      if (typeof globalFn === "function") {
        globalFn(quality);
      }
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "mt-6 grid w-full max-w-md grid-cols-2 gap-3 px-2 sm:grid-cols-4", children: qualityButtons.map(({ label, quality, color, textColor }) => /* @__PURE__ */ jsx(
    "button",
    {
      onClick: () => handleRate(quality),
      className: `touch-target rounded-lg p-4 text-base font-semibold ${textColor} ${color} touch-feedback focus-mobile shadow-md transition-all duration-200 ease-in-out hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-offset-2 focus:ring-offset-slate-200`,
      "aria-label": `Rate recall as ${label}`,
      children: label
    },
    label
  )) });
};

const AppContext = createContext(void 0);
const AppProvider = ({ children }) => {
  const contextValue = {
    showError: (message, description) => {
      console.log("Error:", message, description);
    },
    showInfo: (message, description) => {
      console.log("Info:", message, description);
    },
    preferences: {
      enableSound: true,
      highContrast: false,
      largeText: false,
      reduceMotion: false
    }
  };
  return /* @__PURE__ */ jsx(AppContext.Provider, { value: contextValue, children });
};

export { $$Header as $, AuthModal as A, DashboardLayout as D, LoadingSpinner as L, RecallQualityControls as R, ThemeToggle as T, authStateAtom as a, $$Sidebar as b, currentProfileStore as c, profileActions as d, AuthenticatedApp as e, AppProvider as f, hybridStorage$1 as h, progressStatsStore as p, studyHistoryStore as s, useAuth as u };
