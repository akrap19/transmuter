import {
  COIN_SORT_FIELDS,
  LAUNCH_STATUSES,
  type CoinQuery,
  type CoinSortField,
  type LaunchStatus,
  type SortDir,
} from "./types";

function isStatus(value: string): value is LaunchStatus {
  return (LAUNCH_STATUSES as readonly string[]).includes(value);
}

function isSort(value: string): value is CoinSortField {
  return (COIN_SORT_FIELDS as readonly string[]).includes(value);
}

function isDir(value: string): value is SortDir {
  return value === "asc" || value === "desc";
}

export function searchParamsFromRecord(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

export function parseCoinSearchParams(params: URLSearchParams): CoinQuery {
  const query: CoinQuery = {};
  const search = params.get("q")?.trim();
  const statuses = params.getAll("status").filter(isStatus);
  const sort = params.get("sort");
  const dir = params.get("dir");
  const backing = params.get("backing")?.trim();

  if (search) query.search = search;
  if (statuses.length === 1) query.status = statuses[0];
  if (statuses.length > 1) query.status = statuses;
  if (sort && isSort(sort)) query.sort = sort;
  if (dir && isDir(dir)) query.dir = dir;
  if (backing) query.backing = backing;

  return query;
}

export function serializeCoinQuery(query: CoinQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  const statuses = query.status == null ? [] : Array.isArray(query.status) ? query.status : [query.status];
  for (const status of statuses) params.append("status", status);
  if (query.sort) params.set("sort", query.sort);
  if (query.dir) params.set("dir", query.dir);
  if (query.backing) params.set("backing", query.backing);
  return params;
}
