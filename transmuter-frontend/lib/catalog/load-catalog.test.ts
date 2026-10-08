import { describe, expect, it, vi } from "vitest";
import { detailFromApi, loadCoinDetail, loadCoinList, mergeBacking, mergeLiveDetail } from "./load-catalog";

const ENV = { NEXT_PUBLIC_API_URL: "http://api.test" };
const MINT = "MintHelix111111111111111111111111111111111";

const HELIX = {
  mint: MINT,
  name: "Helix",
  symbol: "HLX",
  creator: "Creator11111111111111111111111111111111111",
  backing: "cSOL",
  status: "sale" as const,
  priceUsd: 2.15,
  marketCapUsd: 860_000,
  backingRatioBps: 2140,
  saleProgressBps: 1000,
  holderCount: 12,
  launchedAt: 1_700_000_000,
  logoUrl: "https://cdn.example/helix.png",
  metadataUri: null,
  description: "Indexed helix",
  socials: { website: "https://helix.example", twitter: null, telegram: null, discord: null },
};

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("loadCoinList", () => {
  it("uses GET /coins when the API responds", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ items: [HELIX], total: 1 }));

    const loaded = await loadCoinList({ search: "helix" }, { fetchFn, env: ENV });

    expect(loaded.source).toBe("api");
    expect(loaded.result).toEqual({ items: [HELIX], total: 1 });
  });

  it("falls back to the sample index when the API is unreachable", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("offline"));

    const loaded = await loadCoinList({}, { fetchFn, env: ENV });

    expect(loaded.source).toBe("sample");
    expect(loaded.result.total).toBeGreaterThan(0);
    expect(loaded.result.items.some((item) => item.status === "voided")).toBe(true);
  });
});

describe("loadCoinDetail", () => {
  it("keeps API list fields and overlays the chain sale snapshot", async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => {
      calls.push(url);
      if (url.endsWith("/chart")) return jsonResponse({ points: [{ t: 10, priceUsd: 1.5, volumeUsd: 20 }] });
      return jsonResponse(HELIX);
    }) as unknown as typeof fetch;
    const readLive = vi.fn().mockResolvedValue({
      status: "sale",
      saleProgressBps: 6100,
      sale: {
        capUsdc: 100_000,
        raisedUsdc: 61_000,
        remainingUsdc: 39_000,
        priceUsd: 0.42,
        closesAt: 1_800_000_000,
        depositsOpen: true,
        myDepositUsdc: 250,
      },
    });

    const loaded = await loadCoinDetail(MINT, { fetchFn, env: ENV, readLive });

    expect(loaded.kind).toBe("coin");
    if (loaded.kind !== "coin") return;
    expect(loaded.detail.symbol).toBe("HLX");
    expect(loaded.detail.priceUsd).toBe(2.15);
    expect(loaded.detail.description).toBe("Indexed helix");
    expect(loaded.detail.chart).toEqual([{ t: 10, priceUsd: 1.5, volumeUsd: 20 }]);
    expect(loaded.detail.status).toBe("sale");
    expect(loaded.detail.sale?.myDepositUsdc).toBe(250);
    expect(loaded.detail.saleProgressBps).toBe(6100);
    expect(loaded.detail.stake).toBeNull();
    expect(calls).toEqual([`http://api.test/coins/${MINT}`, `http://api.test/coins/${MINT}/chart`]);
  });

  it("distinguishes a missing mint from an API outage", async () => {
    const missing = vi.fn().mockResolvedValue(jsonResponse({ error: "not found" }, 404));
    const down = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(loadCoinDetail(MINT, { fetchFn: missing, env: ENV })).resolves.toEqual({ kind: "missing" });
    await expect(loadCoinDetail(MINT, { fetchFn: down, env: ENV })).resolves.toEqual({ kind: "unavailable" });
  });

  it("shows the factory launch when the index has not caught it yet", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: "not found" }, 404));
    const readChain = vi.fn().mockResolvedValue(
      detailFromApi({ ...HELIX, description: "On chain", socials: HELIX.socials, chart: [] }, []),
    );
    const readLive = vi.fn().mockResolvedValue({
      status: "sale",
      saleProgressBps: 0,
      sale: {
        capUsdc: 1000,
        raisedUsdc: 0,
        remainingUsdc: 1000,
        priceUsd: 0.1,
        closesAt: 1_800_000_000,
        depositsOpen: true,
        myDepositUsdc: 0,
      },
    });

    const loaded = await loadCoinDetail(MINT, { fetchFn, env: ENV, readChain, readLive });

    expect(loaded.kind).toBe("coin");
    if (loaded.kind !== "coin") return;
    expect(loaded.source).toBe("chain");
    expect(loaded.detail.name).toBe("Helix");
    expect(loaded.detail.sale?.capUsdc).toBe(1000);
  });
});

describe("mergeLiveDetail", () => {
  it("leaves indexed progress in place once the sale is no longer open", () => {
    const detail = detailFromApi(
      { ...HELIX, description: "", socials: HELIX.socials, chart: [] },
      [],
    );

    const merged = mergeLiveDetail(detail, { status: "active", sale: null, saleProgressBps: 10_000 });

    expect(merged.status).toBe("active");
    expect(merged.sale).toBeNull();
    expect(merged.saleProgressBps).toBe(1000);
  });
});

describe("mergeBacking", () => {
  it("replaces the empty treasury with the chain read, including unconverted USDC", () => {
    const detail = detailFromApi({ ...HELIX, description: "", socials: HELIX.socials, chart: [] }, []);
    const treasury = {
      ...detail.treasury,
      cTokenAmount: 2,
      unconvertedUsdc: 7,
      cTokenPriceUsd: 1.5,
      backingValueUsd: 10,
      circulatingSupply: 1_000,
      redemptionRatio: 0.002,
    };

    const merged = mergeBacking(detail, { treasury, backingRatioBps: 5000 });

    expect(merged.treasury.unconvertedUsdc).toBe(7);
    expect(merged.treasury.backingValueUsd).toBe(10);
    expect(merged.backingRatioBps).toBe(5000);
    expect(mergeBacking(detail, null).treasury.unconvertedUsdc).toBe(0);
  });
});
