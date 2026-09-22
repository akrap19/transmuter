import type { ChartPoint, CoinListItem, IndexedCoin } from "./types.ts";

export type CatalogStore = {
  list: () => Promise<CoinListItem[]>;
  get: (mint: string) => Promise<IndexedCoin | null>;
  chart: (mint: string) => Promise<ChartPoint[]>;
};
