import { describe, expect, it } from "vitest";
import { queryCoins } from "./query.ts";
import type { CoinListItem } from "./types.ts";

const CREATOR_A = "Creator11111111111111111111111111111111111";
const CREATOR_B = "Creator22222222222222222222222222222222222";

function coin(partial: Partial<CoinListItem> & Pick<CoinListItem, "mint" | "name" | "status">): CoinListItem {
  return {
    symbol: partial.symbol ?? partial.name.slice(0, 4).toUpperCase(),
    creator: CREATOR_A,
    backing: "cSOL",
    priceUsd: 1,
    marketCapUsd: 1000,
    backingRatioBps: 1800,
    saleProgressBps: 5000,
    holderCount: 10,
    launchedAt: 1_700_000_000,
    logoUrl: null,
    metadataUri: null,
    ...partial,
  };
}

const catalog: CoinListItem[] = [
  coin({ mint: "MintSale111111111111111111111111111111111", name: "Aurora", symbol: "AUR", status: "sale", launchedAt: 100, marketCapUsd: 50 }),
  coin({ mint: "MintLive111111111111111111111111111111111", name: "Helix", symbol: "HLX", status: "active", launchedAt: 300, marketCapUsd: 900, priceUsd: 2.5, creator: CREATOR_B }),
  coin({ mint: "MintVoid111111111111111111111111111111111", name: "Nimbus", symbol: "NMB", status: "voided", launchedAt: 200, marketCapUsd: null, priceUsd: null, saleProgressBps: 1200 }),
];

describe("queryCoins", () => {
  it("returns every launch including VOIDED when no status filter is set", () => {
    const result = queryCoins(catalog, {});

    expect(result.items.map((item) => item.symbol)).toEqual(["HLX", "NMB", "AUR"]);
    expect(result.total).toBe(3);
    expect(result.items.some((item) => item.status === "voided")).toBe(true);
  });

  it("searches name, symbol, and mint case-insensitively", () => {
    expect(queryCoins(catalog, { search: "nim" }).items.map((item) => item.symbol)).toEqual(["NMB"]);
    expect(queryCoins(catalog, { search: "hlx" }).items.map((item) => item.symbol)).toEqual(["HLX"]);
    expect(queryCoins(catalog, { search: "mintsale" }).items.map((item) => item.symbol)).toEqual(["AUR"]);
  });

  it("filters by one or more launch statuses", () => {
    expect(queryCoins(catalog, { status: "voided" }).items.map((item) => item.symbol)).toEqual(["NMB"]);
    expect(queryCoins(catalog, { status: ["sale", "active"] }).items.map((item) => item.symbol)).toEqual(["HLX", "AUR"]);
  });

  it("filters by backing asset", () => {
    const mixed = [
      ...catalog,
      coin({ mint: "MintBtc11111111111111111111111111111111111", name: "Forge", symbol: "FRG", status: "sale", backing: "cBTC", launchedAt: 400 }),
    ];

    expect(queryCoins(mixed, { backing: "cBTC" }).items.map((item) => item.symbol)).toEqual(["FRG"]);
  });

  it("sorts by market cap with nulls last, and by name ascending", () => {
    expect(queryCoins(catalog, { sort: "marketCapUsd", dir: "desc" }).items.map((item) => item.symbol)).toEqual([
      "HLX",
      "AUR",
      "NMB",
    ]);
    expect(queryCoins(catalog, { sort: "name", dir: "asc" }).items.map((item) => item.symbol)).toEqual(["AUR", "HLX", "NMB"]);
  });

  it("paginates after sorting", () => {
    const result = queryCoins(catalog, { limit: 1, offset: 1 });

    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.symbol)).toEqual(["NMB"]);
  });
});
