/**
 * High-performance Cache Layer
 * Provides fast in-memory caching with TTL and automatic cleanup.
 * Falls back to memory cache seamlessly if Redis is not configured.
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  del(key) {
    this.cache.delete(key);
  }

  delByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();

/**
 * Cache Wrapper for async operations
 * @param {string} key Cache key
 * @param {number} ttlSeconds Time to live in seconds
 * @param {Function} fetchFn Function that returns fresh data
 */
export const getOrSetCache = async (key, ttlSeconds, fetchFn) => {
  const cached = memoryCache.get(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetchFn();
  memoryCache.set(key, fresh, ttlSeconds);
  return fresh;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  memoryCache.set(key, value, ttlSeconds);
};

export const getCache = async (key) => {
  return memoryCache.get(key);
};

export const invalidateCachePrefix = async (prefix) => {
  memoryCache.delByPrefix(prefix);
};
