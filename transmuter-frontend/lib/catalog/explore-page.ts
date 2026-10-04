import type { CoinListItem, CoinQuery } from "./types";

export const EXPLORE_PAGE_SIZE = 60;

export function explorePageQuery(query: CoinQuery, offset: number): CoinQuery {
  const filters: CoinQuery = { ...query };
  delete filters.limit;
  delete filters.offset;
  const safeOffset = Number.isInteger(offset) && offset > 0 ? offset : 0;
  return { ...filters, limit: EXPLORE_PAGE_SIZE, offset: safeOffset };
}

export function exploreHasMore(loaded: number, total: number): boolean {
  return loaded < total;
}

export function appendCoinPage(current: CoinListItem[], page: CoinListItem[]): CoinListItem[] {
  const seen = new Set(current.map((item) => item.mint));
  const next = page.filter((item) => !seen.has(item.mint));
  if (next.length === 0) return current;
  return [...current, ...next];
}
