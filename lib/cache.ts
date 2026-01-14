/**
 * Simple in-memory cache for API responses
 * For production, consider using Redis
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class SimpleCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private maxSize: number = 1000;

    set<T>(key: string, data: T, ttl: number = 60000): void {
        // Remove oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

export const cache = new SimpleCache();

/**
 * Cache decorator for async functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl: number = 60000
): T {
    return (async (...args: Parameters<T>) => {
        const key = keyGenerator 
            ? keyGenerator(...args)
            : `cache:${fn.name}:${JSON.stringify(args)}`;
        
        const cached = cache.get(key);
        if (cached !== null) {
            return cached;
        }

        const result = await fn(...args);
        cache.set(key, result, ttl);
        return result;
    }) as T;
}






