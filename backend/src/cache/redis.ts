import type { CacheStore } from "./types.ts";

export type RedisCommands = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, expiryMode: "EX", ttlSeconds: number) => Promise<unknown>;
};

export function createRedisCache(redis: RedisCommands): CacheStore {
  return {
    async get(key) {
      return redis.get(key);
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds <= 0) return;
      await redis.set(key, value, "EX", ttlSeconds);
    },
  };
}
