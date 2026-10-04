import { describe, expect, it, vi } from "vitest";
import { appendCoinPage, EXPLORE_PAGE_SIZE, exploreHasMore, explorePageQuery } from "./explore-page";
import { loadCoinList } from "./load-catalog";
import { queryCoins } from "./query";
import type { CoinListItem } from "./types";

function coin(index: number): CoinListItem {
  return {
    mint: `Mint${index}`,
    name: `Coin ${index}`,
    symbol: "COIN",
    creator: "Creator11111111111111111111111111111111111",
    backing: "cSOL",
    status: "active",
    priceUsd: 1,
    marketCapUsd: 1000,
    backingRatioBps: 1800,
    saleProgressBps: null,
    holderCount: index,
    launchedAt: index,
    logoUrl: null,
    metadataUri: null,
  };
}

describe("explore page size", () => {
  it("loads 60 launches on the first page and the next page after that", () => {
    const catalog = Array.from({ length: 130 }, (_, index) => coin(index + 1));

    const first = queryCoins(catalog, explorePageQuery({ sort: "launchedAt", dir: "asc" }, 0));
    const second = queryCoins(catalog, explorePageQuery({ sort: "launchedAt", dir: "asc" }, first.items.length));

    expect(EXPLORE_PAGE_SIZE).toBe(60);
    expect(first.items).toHaveLength(60);
    expect(first.total).toBe(130);
    expect(second.items.map((item) => item.mint)).toEqual(catalog.slice(60, 120).map((item) => item.mint));
    expect(exploreHasMore(first.items.length, first.total)).toBe(true);
    expect(exploreHasMore(120, 130)).toBe(true);
    expect(exploreHasMore(130, 130)).toBe(false);
  });

  it("keeps filters and ignores a caller-supplied page size", () => {
    expect(explorePageQuery({ search: "helix", status: "sale", limit: 5, offset: 9 }, 60)).toEqual({
      search: "helix",
      status: "sale",
      limit: 60,
      offset: 60,
    });
    expect(explorePageQuery({}, -1).offset).toBe(0);
  });

  it("appends the next page without repeating a mint", () => {
    const first = [coin(1), coin(2)];
    const page = [coin(2), coin(3)];

    expect(appendCoinPage(first, page).map((item) => item.mint)).toEqual(["Mint1", "Mint2", "Mint3"]);
    expect(appendCoinPage(first, [coin(1)])).toBe(first);
  });

  it("asks the catalog API for limit 60", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0 }),
    });

    await loadCoinList(explorePageQuery({ search: "helix" }, 120), {
      fetchFn,
      env: { NEXT_PUBLIC_API_URL: "http://api.test" },
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://api.test/coins?q=helix&limit=60&offset=120",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
