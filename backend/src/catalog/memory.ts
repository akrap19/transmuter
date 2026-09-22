import type { CatalogStore } from "./store.ts";
import type { ChartPoint, CoinListItem, IndexedCoin } from "./types.ts";

function toListItem(coin: IndexedCoin): CoinListItem {
  const { description: _description, socials: _socials, ...item } = coin;
  return item;
}

export function createMemoryCatalog(
  records: IndexedCoin[] = [],
  charts: Record<string, ChartPoint[]> = {},
): CatalogStore {
  const byMint = new Map(records.map((record) => [record.mint, record]));

  return {
    async list() {
      return [...byMint.values()].map(toListItem);
    },
    async get(mint) {
      return byMint.get(mint) ?? null;
    },
    async chart(mint) {
      return charts[mint] ?? [];
    },
  };
}
