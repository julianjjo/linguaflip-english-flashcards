import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  strategy?: 'lru' | 'fifo'; // Cache eviction strategy
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

class CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private accessOrder = new Map<string, number>(); // For LRU
  private accessCounter = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 1000 * 60 * 30, // 30 minutes default
      maxSize: options.maxSize || 100,
      strategy: options.strategy || 'lru',
    };
  }

  set(key: string, data: T, customTtl?: number, metadata?: Record<string, any>): void {
    const now = Date.now();
    const ttl = customTtl || this.options.ttl;
    const expiresAt = now + ttl;

    // Remove expired entries
    this.cleanExpired();

    // Evict if cache is full
    if (this.cache.size >= this.options.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      metadata,
    });

    // Update access order for LRU
    if (this.options.strategy === 'lru') {
      this.accessOrder.set(key, ++this.accessCounter);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access order for LRU
    if (this.options.strategy === 'lru') {
      this.accessOrder.set(key, ++this.accessCounter);
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    this.cleanExpired();
    return this.cache.size;
  }

  keys(): string[] {
    this.cleanExpired();
    return Array.from(this.cache.keys());
  }

  entries(): Array<[string, CacheEntry<T>]> {
    this.cleanExpired();
    return Array.from(this.cache.entries());
  }

  private cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
  }

  private evict(): void {
    if (this.options.strategy === 'fifo') {
      // FIFO: Remove oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      }
    } else if (this.options.strategy === 'lru') {
      // LRU: Remove least recently used
      let lruKey: string | null = null;
      let lruAccess = Number.MAX_SAFE_INTEGER;

      for (const [key, accessTime] of this.accessOrder.entries()) {
        if (accessTime < lruAccess) {
          lruAccess = accessTime;
          lruKey = key;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
        this.accessOrder.delete(lruKey);
      }
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    this.cleanExpired();
    return {
      hits: 0, // Would need to be tracked separately
      misses: 0, // Would need to be tracked separately
      evictions: 0, // Would need to be tracked separately
      size: this.cache.size,
    };
  }
}

// Global cache instances
const aiResponseCache = new CacheManager({
  ttl: 1000 * 60 * 60, // 1 hour for AI responses
  maxSize: 50,
  strategy: 'lru',
});

const imageCache = new CacheManager<Blob>({
  ttl: 1000 * 60 * 60 * 24, // 24 hours for images
  maxSize: 20,
  strategy: 'lru',
});

const generalCache = new CacheManager({
  ttl: 1000 * 60 * 15, // 15 minutes for general data
  maxSize: 100,
  strategy: 'lru',
});

export const useCacheSystem = () => {
  const [stats, setStats] = useState({
    aiResponses: aiResponseCache.getStats(),
    images: imageCache.getStats(),
    general: generalCache.getStats(),
  });

  const updateStats = useCallback(() => {
    setStats({
      aiResponses: aiResponseCache.getStats(),
      images: imageCache.getStats(),
      general: generalCache.getStats(),
    });
  }, []);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(updateStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updateStats]);

  const ai = {
    set: (key: string, data: any, ttl?: number) => {
      aiResponseCache.set(key, data, ttl);
      updateStats();
    },
    get: (key: string) => {
      const result = aiResponseCache.get(key);
      updateStats();
      return result;
    },
    has: (key: string) => aiResponseCache.has(key),
    delete: (key: string) => {
      const result = aiResponseCache.delete(key);
      updateStats();
      return result;
    },
    clear: () => {
      aiResponseCache.clear();
      updateStats();
    },
  };

  const images = {
    set: (key: string, data: Blob, ttl?: number) => {
      imageCache.set(key, data, ttl);
      updateStats();
    },
    get: (key: string) => {
      const result = imageCache.get(key);
      updateStats();
      return result;
    },
    has: (key: string) => imageCache.has(key),
    delete: (key: string) => {
      const result = imageCache.delete(key);
      updateStats();
      return result;
    },
    clear: () => {
      imageCache.clear();
      updateStats();
    },
  };

  const general = {
    set: (key: string, data: any, ttl?: number) => {
      generalCache.set(key, data, ttl);
      updateStats();
    },
    get: (key: string) => {
      const result = generalCache.get(key);
      updateStats();
      return result;
    },
    has: (key: string) => generalCache.has(key),
    delete: (key: string) => {
      const result = generalCache.delete(key);
      updateStats();
      return result;
    },
    clear: () => {
      generalCache.clear();
      updateStats();
    },
  };

  const clearAll = useCallback(() => {
    aiResponseCache.clear();
    imageCache.clear();
    generalCache.clear();
    updateStats();
  }, [updateStats]);

  return {
    ai,
    images,
    general,
    clearAll,
    stats,
  };
};

// Utility functions for cache keys
export const createAICacheKey = (userId: string, operation: string, params: Record<string, any>): string => {
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');
  return `ai:${userId}:${operation}:${paramString}`;
};

export const createImageCacheKey = (url: string, quality: number): string => {
  return `img:${url}:${quality}`;
};

export const createGeneralCacheKey = (namespace: string, key: string): string => {
  return `general:${namespace}:${key}`;
};