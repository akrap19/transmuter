import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type AppInstance } from "./app.ts";
import { createMemoryCache } from "./cache/memory.ts";
import type { CatalogStore } from "./catalog/store.ts";
import type { CoinListItem, IndexedCoin } from "./catalog/types.ts";

function listItem(coin: IndexedCoin): CoinListItem {
  const { description: _description, socials: _socials, ...item } = coin;
  return item;
}

function coin(symbol: string, launchedAt: number): IndexedCoin {
  return {
    mint: `Mint${symbol}111111111111111111111111111111111`,
    name: symbol,
    symbol,
    creator: "Creator11111111111111111111111111111111111",
    backing: "cSOL",
    status: "active",
    priceUsd: 1,
    marketCapUsd: 1000,
    backingRatioBps: 1800,
    saleProgressBps: 0,
    holderCount: 1,
    launchedAt,
    logoUrl: null,
    metadataUri: null,
    description: "",
    socials: { website: null, twitter: null, telegram: null, discord: null },
  };
}

function mutableCatalog(initial: IndexedCoin[]): CatalogStore & { replace: (next: IndexedCoin[]) => void } {
  let records = [...initial];
  return {
    replace(next) {
      records = [...next];
    },
    async list() {
      return records.map(listItem);
    },
    async get(mint) {
      return records.find((row) => row.mint === mint) ?? null;
    },
    async chart() {
      return [];
    },
  };
}

describe("list/detail cache", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("serves a cached coin list until TTL so a rebuild of the index is not hit on every browse", async () => {
    const catalog = mutableCatalog([coin("AUR", 100)]);
    app = await buildApp({
      catalog,
      cache: createMemoryCache(),
      cacheTtlSeconds: 60,
      publicUrl: "http://localhost:3001",
    });

    const first = await app.inject({ method: "GET", url: "/coins" });
    catalog.replace([coin("AUR", 100), coin("HLX", 200)]);
    const second = await app.inject({ method: "GET", url: "/coins" });

    expect(first.json().total).toBe(1);
    expect(second.json().total).toBe(1);
    expect(second.json().items.map((item: { symbol: string }) => item.symbol)).toEqual(["AUR"]);
  });

  it("does not reuse a list cache entry across different query strings", async () => {
    const catalog = mutableCatalog([coin("AUR", 100), coin("HLX", 200)]);
    app = await buildApp({
      catalog,
      cache: createMemoryCache(),
      cacheTtlSeconds: 60,
      publicUrl: "http://localhost:3001",
    });

    const all = await app.inject({ method: "GET", url: "/coins" });
    const search = await app.inject({ method: "GET", url: "/coins?q=hlx" });

    expect(all.json().total).toBe(2);
    expect(search.json().items.map((item: { symbol: string }) => item.symbol)).toEqual(["HLX"]);
  });

  it("still returns catalog data when the cache is down", async () => {
    const catalog = mutableCatalog([coin("AUR", 100)]);
    app = await buildApp({
      catalog,
      cache: {
        async get() {
          throw new Error("redis down");
        },
        async set() {
          throw new Error("redis down");
        },
      },
      cacheTtlSeconds: 60,
      publicUrl: "http://localhost:3001",
    });

    const res = await app.inject({ method: "GET", url: "/coins" });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
  });
});
