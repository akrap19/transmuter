import { describe, expect, it } from "vitest";
import { createRedisCache } from "./redis.ts";

describe("createRedisCache", () => {
  it("reads and writes values with a TTL in seconds", async () => {
    const store = new Map<string, { value: string; ttl: number }>();
    const cache = createRedisCache({
      get: async (key) => store.get(key)?.value ?? null,
      set: async (key, value, mode, ttl) => {
        if (mode !== "EX") throw new Error(`expected EX, got ${String(mode)}`);
        store.set(key, { value, ttl });
        return "OK";
      },
    });

    await cache.set("coins:list:", '{"total":1}', 15);
    expect(store.get("coins:list:")).toEqual({ value: '{"total":1}', ttl: 15 });
    expect(await cache.get("coins:list:")).toBe('{"total":1}');
  });

  it("skips writes when TTL is not positive", async () => {
    const setCalls: unknown[] = [];
    const cache = createRedisCache({
      get: async () => null,
      set: async (...args) => {
        setCalls.push(args);
        return "OK";
      },
    });

    await cache.set("coins:list:", "{}", 0);
    expect(setCalls).toEqual([]);
  });
});
