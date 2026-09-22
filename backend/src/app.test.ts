import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type AppInstance } from "./app.ts";
import { createMemoryCache } from "./cache/memory.ts";
import { createMemoryCatalog } from "./catalog/memory.ts";
import type { IndexedCoin } from "./catalog/types.ts";

const CREATOR = "Creator11111111111111111111111111111111111";

function indexed(partial: Partial<IndexedCoin> & Pick<IndexedCoin, "mint" | "name" | "status">): IndexedCoin {
  return {
    symbol: partial.symbol ?? partial.name.slice(0, 4).toUpperCase(),
    creator: CREATOR,
    backing: "cSOL",
    priceUsd: 1,
    marketCapUsd: 1000,
    backingRatioBps: 1800,
    saleProgressBps: 5000,
    holderCount: 10,
    launchedAt: 1_700_000_000,
    logoUrl: null,
    metadataUri: null,
    description: "",
    socials: { website: null, twitter: null, telegram: null, discord: null },
    ...partial,
  };
}

const launches: IndexedCoin[] = [
  indexed({ mint: "MintSale111111111111111111111111111111111", name: "Aurora", symbol: "AUR", status: "sale", launchedAt: 100, marketCapUsd: 50 }),
  indexed({
    mint: "MintLive111111111111111111111111111111111",
    name: "Helix",
    symbol: "HLX",
    status: "active",
    launchedAt: 300,
    marketCapUsd: 900,
    priceUsd: 2.5,
    description: "Helix treasury still holds unconverted USDC.",
    socials: { website: "https://helix.example", twitter: "https://x.com/helix", telegram: null, discord: null },
  }),
  indexed({
    mint: "MintVoid111111111111111111111111111111111",
    name: "Nimbus",
    symbol: "NMB",
    status: "voided",
    launchedAt: 200,
    marketCapUsd: null,
    priceUsd: null,
    saleProgressBps: 1200,
  }),
];

async function appWith(records = launches) {
  return buildApp({
    catalog: createMemoryCatalog(records),
    cache: createMemoryCache(),
    cacheTtlSeconds: 0,
    publicUrl: "http://localhost:3001",
  });
}

describe("GET /coins", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("returns an empty page when the index has no launches", async () => {
    app = await appWith([]);
    const res = await app.inject({ method: "GET", url: "/coins" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [], total: 0 });
  });

  it("reports liveness on GET /health", async () => {
    app = await appWith([]);
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("lists every indexed launch including VOIDED, newest first", async () => {
    app = await appWith();
    const res = await app.inject({ method: "GET", url: "/coins" });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { symbol: string; status: string }[]; total: number };
    expect(body.total).toBe(3);
    expect(body.items.map((item) => item.symbol)).toEqual(["HLX", "NMB", "AUR"]);
    expect(body.items.some((item) => item.status === "voided")).toBe(true);
  });

  it("searches, filters, sorts, and paginates from query params", async () => {
    app = await appWith();

    const search = await app.inject({ method: "GET", url: "/coins?q=nim" });
    expect(search.json().items.map((item: { symbol: string }) => item.symbol)).toEqual(["NMB"]);

    const status = await app.inject({ method: "GET", url: "/coins?status=sale&status=active" });
    expect(status.json().items.map((item: { symbol: string }) => item.symbol)).toEqual(["HLX", "AUR"]);

    const backing = await app.inject({
      method: "GET",
      url: "/coins?backing=cBTC",
    });
    expect(backing.json()).toEqual({ items: [], total: 0 });

    const page = await app.inject({ method: "GET", url: "/coins?sort=name&dir=asc&limit=1&offset=1" });
    expect(page.json().total).toBe(3);
    expect(page.json().items.map((item: { symbol: string }) => item.symbol)).toEqual(["HLX"]);
  });
});

describe("GET /coins/:mint", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("returns indexed metadata for a known mint", async () => {
    app = await appWith();
    const res = await app.inject({ method: "GET", url: "/coins/MintLive111111111111111111111111111111111" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      mint: "MintLive111111111111111111111111111111111",
      symbol: "HLX",
      status: "active",
      description: "Helix treasury still holds unconverted USDC.",
      socials: { website: "https://helix.example", twitter: "https://x.com/helix", telegram: null, discord: null },
      chart: [],
    });
  });

  it("returns 404 for a mint that is not in the index", async () => {
    app = await appWith();
    const res = await app.inject({ method: "GET", url: "/coins/UnknownMint111111111111111111111111111" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not found" });
  });
});

const helixChart = [
  { t: 1_745_000_000, priceUsd: 1.8, volumeUsd: 12_400 },
  { t: 1_745_100_000, priceUsd: 2.15, volumeUsd: 18_600 },
];

async function appWithCharts() {
  return buildApp({
    catalog: createMemoryCatalog(launches, { MintLive111111111111111111111111111111111: helixChart }),
    cache: createMemoryCache(),
    cacheTtlSeconds: 0,
    publicUrl: "http://localhost:3001",
  });
}

describe("GET /coins/:mint/chart", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("returns price history points for charts", async () => {
    app = await appWithCharts();
    const res = await app.inject({ method: "GET", url: "/coins/MintLive111111111111111111111111111111111/chart" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ points: helixChart });
  });

  it("returns 404 when the mint is not indexed", async () => {
    app = await appWithCharts();
    const res = await app.inject({ method: "GET", url: "/coins/UnknownMint111111111111111111111111111/chart" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not found" });
  });
});

describe("GET /users/:wallet/created", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("lists launches whose on-chain creator matches the wallet", async () => {
    const other = "Creator22222222222222222222222222222222222";
    app = await appWith([
      indexed({ mint: "MintA111111111111111111111111111111111111", name: "Aurora", symbol: "AUR", status: "sale", creator: CREATOR, launchedAt: 100 }),
      indexed({ mint: "MintB111111111111111111111111111111111111", name: "Helix", symbol: "HLX", status: "active", creator: other, launchedAt: 300 }),
      indexed({ mint: "MintC111111111111111111111111111111111111", name: "Nimbus", symbol: "NMB", status: "voided", creator: CREATOR, launchedAt: 200 }),
    ]);

    const res = await app.inject({ method: "GET", url: `/users/${CREATOR}/created` });

    expect(res.statusCode).toBe(200);
    expect(res.json().items.map((item: { symbol: string }) => item.symbol)).toEqual(["NMB", "AUR"]);
  });
});

describe("GET /users/:wallet/held", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("intersects requested token accounts with known EOL mints", async () => {
    app = await appWith();
    const res = await app.inject({
      method: "GET",
      url: "/users/Holder11111111111111111111111111111111111/held?mint=MintLive111111111111111111111111111111111&amount=40&mint=UnknownMint111111111111111111111111111&amount=9&mint=MintVoid111111111111111111111111111111111&amount=0",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([
      expect.objectContaining({
        mint: "MintLive111111111111111111111111111111111",
        symbol: "HLX",
        amount: 40,
      }),
    ]);
  });

  it("returns no holdings when the wallet supplies no token accounts", async () => {
    app = await appWith();
    const res = await app.inject({
      method: "GET",
      url: "/users/Holder11111111111111111111111111111111111/held",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [] });
  });
});
