/**
 * Audio Cache Service using IndexedDB
 * Provides persistent storage for generated audio files with size management
 */

export interface CachedAudio {
  id: string;
  text: string;
  voice: string;
  audioData: Uint8Array;
  mimeType: string;
  duration?: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface AudioCacheOptions {
  maxCacheSize: number; // in MB
  maxEntries: number;
  maxAge: number; // in milliseconds
}

const DEFAULT_OPTIONS: AudioCacheOptions = {
  maxCacheSize: 100, // 100MB
  maxEntries: 500,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AudioCacheService {
  private dbName = 'linguaflip-audio-cache';
  private dbVersion = 1;
  private storeName = 'audio-files';
  private db: IDBDatabase | null = null;
  private options: AudioCacheOptions;

  constructor(options: Partial<AudioCacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the IndexedDB connection
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(
          new Error(`Failed to open IndexedDB: ${request.error?.message}`)
        );
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('text', 'text', { unique: false });
          store.createIndex('voice', 'voice', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('textVoice', ['text', 'voice'], { unique: false });
        }
      };
    });
  }

  /**
   * Generate cache key for audio entry
   */
  private generateCacheKey(text: string, voice: string): string {
    const normalized = text.toLowerCase().trim();
    return `${voice}:${btoa(normalized)}`;
  }

  /**
   * Store audio data in cache
   */
  async storeAudio(
    text: string,
    voice: string,
    audioData: Uint8Array,
    mimeType: string,
    duration?: number
  ): Promise<void> {
    try {
      const db = await this.initDB();
      const id = this.generateCacheKey(text, voice);
      const now = Date.now();

      const cacheEntry: CachedAudio = {
        id,
        text: text.trim(),
        voice,
        audioData,
        mimeType,
        duration,
        timestamp: now,
        accessCount: 1,
        lastAccessed: now,
      };

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(cacheEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(
        `[AudioCache] Stored audio for "${text.substring(0, 50)}..." with voice ${voice}`
      );

      // Cleanup old entries if needed
      await this.cleanup();
    } catch (error) {
      console.error('[AudioCache] Failed to store audio:', error);
      throw error;
    }
  }

  /**
   * Retrieve audio data from cache
   */
  async getAudio(text: string, voice: string): Promise<CachedAudio | null> {
    try {
      const db = await this.initDB();
      const id = this.generateCacheKey(text, voice);

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const cacheEntry = await new Promise<CachedAudio | null>(
        (resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => {
            resolve(request.result || null);
          };
          request.onerror = () => reject(request.error);
        }
      );

      if (cacheEntry) {
        // Check if entry is expired
        const now = Date.now();
        if (now - cacheEntry.timestamp > this.options.maxAge) {
          console.log(
            `[AudioCache] Entry expired for "${text.substring(0, 50)}..."`
          );
          await this.removeAudio(text, voice);
          return null;
        }

        // Update access statistics
        cacheEntry.accessCount++;
        cacheEntry.lastAccessed = now;

        const updateRequest = store.put(cacheEntry);
        updateRequest.onerror = () => {
          console.warn(
            '[AudioCache] Failed to update access stats:',
            updateRequest.error
          );
        };

        console.log(
          `[AudioCache] Retrieved cached audio for "${text.substring(0, 50)}..." (${cacheEntry.accessCount} accesses)`
        );
        return cacheEntry;
      }

      return null;
    } catch (error) {
      console.error('[AudioCache] Failed to retrieve audio:', error);
      return null;
    }
  }

  /**
   * Remove specific audio entry from cache
   */
  async removeAudio(text: string, voice: string): Promise<void> {
    try {
      const db = await this.initDB();
      const id = this.generateCacheKey(text, voice);

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(
        `[AudioCache] Removed audio for "${text.substring(0, 50)}..." with voice ${voice}`
      );
    } catch (error) {
      console.error('[AudioCache] Failed to remove audio:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    entryCount: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const entries = await new Promise<CachedAudio[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const totalSize = entries.reduce(
        (sum, entry) => sum + entry.audioData.length,
        0
      );
      const timestamps = entries.map((entry) => entry.timestamp);

      return {
        entryCount: entries.length,
        totalSize,
        oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
        newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
      };
    } catch (error) {
      console.error('[AudioCache] Failed to get cache stats:', error);
      return {
        entryCount: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Clean up cache based on size and age constraints
   */
  async cleanup(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      const maxSizeBytes = this.options.maxCacheSize * 1024 * 1024; // Convert MB to bytes

      // Check if cleanup is needed
      if (
        stats.entryCount <= this.options.maxEntries &&
        stats.totalSize <= maxSizeBytes
      ) {
        return;
      }

      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Get all entries sorted by access patterns (LRU-like)
      const entries = await new Promise<CachedAudio[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sort by priority: least recently used + least accessed
      entries.sort((a, b) => {
        const aScore = a.lastAccessed + a.accessCount * 10000; // Weight access count
        const bScore = b.lastAccessed + b.accessCount * 10000;
        return aScore - bScore; // Ascending = least valuable first
      });

      // Calculate how many entries to remove
      let entriesToRemove = Math.max(
        0,
        stats.entryCount - this.options.maxEntries,
        entries.length - Math.floor(this.options.maxEntries * 0.8) // Keep 20% buffer
      );

      // Also remove entries if size is exceeded
      let currentSize = stats.totalSize;
      let removeIndex = 0;

      while (currentSize > maxSizeBytes && removeIndex < entries.length) {
        currentSize -= entries[removeIndex].audioData.length;
        entriesToRemove = Math.max(entriesToRemove, removeIndex + 1);
        removeIndex++;
      }

      // Remove old entries
      const now = Date.now();
      for (let i = 0; i < Math.min(entriesToRemove, entries.length); i++) {
        const entry = entries[i];

        // Always remove expired entries
        if (now - entry.timestamp > this.options.maxAge) {
          await new Promise<void>((resolve, reject) => {
            const request = store.delete(entry.id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }

      console.log(
        `[AudioCache] Cleanup completed. Removed ${entriesToRemove} entries.`
      );
    } catch (error) {
      console.error('[AudioCache] Cleanup failed:', error);
    }
  }

  /**
   * Clear all cached audio
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('[AudioCache] Cache cleared completely');
    } catch (error) {
      console.error('[AudioCache] Failed to clear cache:', error);
    }
  }

  /**
   * Search for cached audio entries
   */
  async searchCache(query: string, limit: number = 20): Promise<CachedAudio[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const entries = await new Promise<CachedAudio[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const queryLower = query.toLowerCase();
      const filtered = entries
        .filter((entry) => entry.text.toLowerCase().includes(queryLower))
        .sort((a, b) => b.lastAccessed - a.lastAccessed)
        .slice(0, limit);

      return filtered;
    } catch (error) {
      console.error('[AudioCache] Search failed:', error);
      return [];
    }
  }

  /**
   * Preload audio for common phrases
   */
  async preloadCommonPhrases(
    phrases: Array<{ text: string; voice: string }>
  ): Promise<void> {
    // This would typically call the TTS API to pre-generate audio
    // Implementation depends on the TTS service integration
    console.log(`[AudioCache] Would preload ${phrases.length} common phrases`);
  }

  /**
   * Check if audio exists in cache
   */
  async hasAudio(text: string, voice: string): Promise<boolean> {
    const cached = await this.getAudio(text, voice);
    return cached !== null;
  }

  /**
   * Get cache size in MB
   */
  async getCacheSize(): Promise<number> {
    const stats = await this.getCacheStats();
    return stats.totalSize / (1024 * 1024);
  }
}

// Export singleton instance
let audioCacheInstance: AudioCacheService | null = null;

export const getAudioCache = (
  options?: Partial<AudioCacheOptions>
): AudioCacheService => {
  if (!audioCacheInstance || options) {
    audioCacheInstance = new AudioCacheService(options);
  }
  return audioCacheInstance;
};

export default AudioCacheService;
