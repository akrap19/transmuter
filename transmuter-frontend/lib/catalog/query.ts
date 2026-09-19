import type { CoinListItem, CoinQuery, CoinQueryResult, CoinSortField } from "./types";

function statusesOf(query: CoinQuery): string[] | null {
  if (!query.status) return null;
  return Array.isArray(query.status) ? query.status : [query.status];
}

function matchesSearch(item: CoinListItem, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [item.name, item.symbol, item.mint].some((value) => value.toLowerCase().includes(needle));
}

function numeric(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

function compareNullable(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * dir;
}

function compareField(a: CoinListItem, b: CoinListItem, sort: CoinSortField, dir: 1 | -1): number {
  if (sort === "name") return a.name.localeCompare(b.name) * dir;
  return compareNullable(numeric(a[sort]), numeric(b[sort]), dir);
}

export function queryCoins(catalog: CoinListItem[], query: CoinQuery): CoinQueryResult {
  const statuses = statusesOf(query);
  const sort = query.sort ?? "launchedAt";
  const dir = query.dir === "asc" ? 1 : -1;

  const matched = catalog.filter((item) => {
    if (statuses && !statuses.includes(item.status)) return false;
    if (query.backing && item.backing !== query.backing) return false;
    if (query.search && !matchesSearch(item, query.search)) return false;
    return true;
  });

  const sorted = [...matched].sort((a, b) => compareField(a, b, sort, dir));
  const offset = query.offset ?? 0;
  const items = query.limit == null ? sorted.slice(offset) : sorted.slice(offset, offset + query.limit);

  return { items, total: sorted.length };
}
