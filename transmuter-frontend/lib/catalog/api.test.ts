import { describe, expect, it, vi } from "vitest";
import { coinListUrl, fetchCoinChart, fetchCoinList, fetchCoinRecord, fetchCreatedCoins, resolveApiBase } from "./api";

const BASE = "http://api.test";
const ENV = { NEXT_PUBLIC_API_URL: BASE };

const HELIX = {
  mint: "MintHelix111111111111111111111111111111111",
  name: "Helix",
  symbol: "HLX",
  creator: "Creator11111111111111111111111111111111111",
  backing: "cSOL",
  status: "active",
  priceUsd: 2.15,
  marketCapUsd: 860_000,
  backingRatioBps: 2140,
  saleProgressBps: 0,
  holderCount: 12,
  launchedAt: 1_700_000_000,
  logoUrl: null,
  metadataUri: null,
  description: "Helix treasury",
  socials: { website: "https://helix.example", twitter: null, telegram: null, discord: null },
  chart: [{ t: 1_745_000_000, priceUsd: 1.8, volumeUsd: 12_400 }],
};

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("catalog api", () => {
  it("builds the coins URL from the public API base and query", () => {
    expect(resolveApiBase(ENV)).toBe(BASE);
    expect(resolveApiBase({})).toBeNull();
    expect(coinListUrl(BASE, { search: "nim", status: ["sale", "active"], sort: "name", dir: "asc", limit: 1, offset: 2 })).toBe(
      `${BASE}/coins?q=nim&status=sale&status=active&sort=name&dir=asc&limit=1&offset=2`,
    );
  });

  it("loads the coin list from GET /coins", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ items: [HELIX], total: 1 }));

    const result = await fetchCoinList({ search: "helix" }, { fetchFn, env: ENV });

    expect(fetchFn).toHaveBeenCalledWith(`${BASE}/coins?q=helix`, { cache: "no-store" });
    expect(result).toEqual({ ok: true, data: { items: [HELIX], total: 1 } });
  });

  it("loads one coin from GET /coins/:mint", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(HELIX));

    const result = await fetchCoinRecord(HELIX.mint, { fetchFn, env: ENV });

    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/coins/${HELIX.mint}`);
    expect(result.ok && result.data.symbol).toBe("HLX");
    expect(result.ok && result.data.description).toBe("Helix treasury");
  });

  it("loads chart points from GET /coins/:mint/chart", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ points: HELIX.chart }));

    const result = await fetchCoinChart(HELIX.mint, { fetchFn, env: ENV });

    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/coins/${HELIX.mint}/chart`);
    expect(result).toEqual({ ok: true, data: HELIX.chart });
  });

  it("loads created launches from GET /users/:wallet/created", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ items: [HELIX], total: 1 }));

    const result = await fetchCreatedCoins(HELIX.creator, { fetchFn, env: ENV });

    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/users/${HELIX.creator}/created`);
    expect(result).toEqual({ ok: true, data: [HELIX] });
  });

  it("reports 404 and network failures without throwing", async () => {
    const missing = vi.fn().mockResolvedValue(jsonResponse({ error: "not found" }, 404));
    const down = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(fetchCoinRecord("missing", { fetchFn: missing, env: ENV })).resolves.toEqual({ ok: false, status: 404 });
    await expect(fetchCoinList({}, { fetchFn: down, env: ENV })).resolves.toEqual({ ok: false, status: "network" });
    await expect(fetchCoinList({}, { env: {} })).resolves.toEqual({ ok: false, status: "unconfigured" });
  });
});
