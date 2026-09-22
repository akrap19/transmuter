import {
  COIN_SORT_FIELDS,
  LAUNCH_STATUSES,
  type CoinQuery,
  type CoinSortField,
  type LaunchStatus,
  type SortDir,
} from "./types.ts";

const MAX_LIMIT = 500;

function isStatus(value: string): value is LaunchStatus {
  return (LAUNCH_STATUSES as readonly string[]).includes(value);
}

function isSort(value: string): value is CoinSortField {
  return (COIN_SORT_FIELDS as readonly string[]).includes(value);
}

function isDir(value: string): value is SortDir {
  return value === "asc" || value === "desc";
}

function intParam(value: string | undefined, fallback: number | undefined): number | undefined {
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function parseCoinQuery(search: URLSearchParams): CoinQuery {
  const query: CoinQuery = {};
  const q = search.get("q")?.trim() ?? search.get("search")?.trim();
  const statuses = search.getAll("status").filter(isStatus);
  const sort = search.get("sort");
  const dir = search.get("dir");
  const backing = search.get("backing")?.trim();
  const limit = intParam(search.get("limit") ?? undefined, undefined);
  const offset = intParam(search.get("offset") ?? undefined, undefined);

  if (q) query.search = q;
  if (statuses.length === 1) query.status = statuses[0];
  if (statuses.length > 1) query.status = statuses;
  if (sort && isSort(sort)) query.sort = sort;
  if (dir && isDir(dir)) query.dir = dir;
  if (backing) query.backing = backing;
  if (limit != null) query.limit = Math.min(limit, MAX_LIMIT);
  if (offset != null) query.offset = offset;

  return query;
}
