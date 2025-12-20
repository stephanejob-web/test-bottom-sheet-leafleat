import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache Service
 * Manages caching with AsyncStorage for improved performance
 */

const CACHE_PREFIX = '@church_app_cache:';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export class CacheService {
    /**
     * Get cached data
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            const cached = await AsyncStorage.getItem(cacheKey);

            if (!cached) {
                return null;
            }

            const entry: CacheEntry<T> = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is still valid
            if (now - entry.timestamp > entry.ttl) {
                // Cache expired, remove it
                await this.remove(key);
                return null;
            }

            return entry.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set cached data
     */
    async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl,
            };

            await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Remove cached data
     */
    async remove(key: string): Promise<void> {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.removeItem(cacheKey);
        } catch (error) {
            console.error('Cache remove error:', error);
        }
    }

    /**
     * Clear all cache
     */
    async clearAll(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Get or fetch pattern
     * Try cache first, if miss then fetch and cache
     */
    async getOrFetch<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = DEFAULT_TTL
    ): Promise<T> {
        // Try cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Cache miss, fetch fresh data
        const data = await fetchFn();
        await this.set(key, data, ttl);
        return data;
    }
}

// Export singleton instance
export const cacheService = new CacheService();
