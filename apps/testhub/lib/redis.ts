/**
 * TestHub Lightweight Redis Client with In-Memory Global Fallback
 * Provides sub-millisecond hot caching for exam reports & chatbot context.
 */

// In-memory fallback map for development or environments without external Redis
declare global {
  // eslint-disable-next-line no-var
  var __studyhub_redis_store: Map<string, { val: string; expiresAt: number }> | undefined;
}

const memoryStore = globalThis.__studyhub_redis_store || new Map<string, { val: string; expiresAt: number }>();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__studyhub_redis_store = memoryStore;
}

export const redis = {
  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    // 1. Try Upstash / REST if configured
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          return data.result ?? null;
        }
      } catch (err) {
        console.warn('[Redis] Remote GET failed, falling back to local memory store:', err);
      }
    }

    // 2. In-Memory Map Fallback
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.val;
  },

  /**
   * Set value with optional TTL (seconds)
   */
  async set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<'OK'> {
    const ttl = (mode === 'EX' && ttlSeconds) ? ttlSeconds : 86400 * 7; // Default 7 days
    const expiresAt = Date.now() + ttl * 1000;

    // 1. Try Upstash / REST if configured
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttl}`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
          cache: 'no-store'
        });
        if (res.ok) return 'OK';
      } catch (err) {
        console.warn('[Redis] Remote SET failed, falling back to local memory store:', err);
      }
    }

    // 2. In-Memory Map Fallback
    memoryStore.set(key, { val: value, expiresAt });
    return 'OK';
  },

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          return data.result ?? 1;
        }
      } catch {}
    }
    const existed = memoryStore.has(key);
    memoryStore.delete(key);
    return existed ? 1 : 0;
  }
};

