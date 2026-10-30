/**
 * StudyHub Web Lightweight Redis Client with In-Memory Global Fallback
 * Retrieves real-time student behavioral exam context for RAG chatbot prompts.
 */

declare global {
  // eslint-disable-next-line no-var
  var __studyhub_redis_store: Map<string, { val: string; expiresAt: number }> | undefined;
}

const memoryStore = globalThis.__studyhub_redis_store || new Map<string, { val: string; expiresAt: number }>();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__studyhub_redis_store = memoryStore;
}

export const redis = {
  async get(key: string): Promise<string | null> {
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

    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.val;
  },

  async set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<'OK'> {
    const ttl = (mode === 'EX' && ttlSeconds) ? ttlSeconds : 86400 * 7;
    const expiresAt = Date.now() + ttl * 1000;

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

    memoryStore.set(key, { val: value, expiresAt });
    return 'OK';
  }
};

