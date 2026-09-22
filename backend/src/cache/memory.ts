import type { CacheStore } from "./types.ts";

type Entry = { value: string; expiresAt: number };

export function createMemoryCache(): CacheStore {
  const entries = new Map<string, Entry>();

  return {
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds <= 0) return;
      entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}
