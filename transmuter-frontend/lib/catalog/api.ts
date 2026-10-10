import { LAUNCH_STATUSES, type BackingLeg, type ChartPoint, type CoinListItem, type CoinQuery, type CoinQueryResult, type CoinSocials, type LaunchStatus } from "./types";
import { serializeCoinQuery } from "./search-params";

export type ApiCoin = CoinListItem & {
  description: string;
  socials: CoinSocials;
  chart: ChartPoint[];
};

export type CatalogResult<T> = { ok: true; data: T } | { ok: false; status: number | "network" | "unconfigured" };

type FetchOptions = {
  fetchFn?: typeof fetch;
  env?: Record<string, string | undefined>;
};

const EMPTY_SOCIALS: CoinSocials = {
  website: null,
  twitter: null,
  telegram: null,
  discord: null,
};

export function resolveApiBase(
  env: Record<string, string | undefined> = { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL },
): string | null {
  const base = (env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  return base || null;
}

export function coinListUrl(base: string, query: CoinQuery): string {
  const params = serializeCoinQuery(query);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  const search = params.toString();
  return search ? `${base}/coins?${search}` : `${base}/coins`;
}

export async function fetchCoinList(query: CoinQuery, options: FetchOptions = {}): Promise<CatalogResult<CoinQueryResult>> {
  const json = await getJson(coinListUrl, query, options);
  if (!json.ok) return json;
  const parsed = parseCoinList(json.body);
  return parsed ? { ok: true, data: parsed } : { ok: false, status: json.status };
}

export async function fetchCoinRecord(mint: string, options: FetchOptions = {}): Promise<CatalogResult<ApiCoin>> {
  const json = await getJson((base) => `${base}/coins/${encodeURIComponent(mint)}`, {}, options);
  if (!json.ok) return json;
  const parsed = parseApiCoin(json.body);
  return parsed ? { ok: true, data: parsed } : { ok: false, status: json.status };
}

export async function fetchCoinChart(mint: string, options: FetchOptions = {}): Promise<CatalogResult<ChartPoint[]>> {
  const json = await getJson((base) => `${base}/coins/${encodeURIComponent(mint)}/chart`, {}, options);
  if (!json.ok) return json;
  if (!json.body || typeof json.body !== "object" || !Array.isArray((json.body as { points?: unknown }).points)) {
    return { ok: false, status: json.status };
  }
  const points = (json.body as { points: unknown[] }).points.filter(isChartPoint);
  return { ok: true, data: points };
}

export async function fetchCreatedCoins(wallet: string, options: FetchOptions = {}): Promise<CatalogResult<CoinListItem[]>> {
  const json = await getJson((base) => `${base}/users/${encodeURIComponent(wallet)}/created`, {}, options);
  if (!json.ok) return json;
  const parsed = parseCoinList(json.body);
  return parsed ? { ok: true, data: parsed.items } : { ok: false, status: json.status };
}

type JsonPath = (base: string, query: CoinQuery) => string;

async function getJson(
  path: JsonPath,
  query: CoinQuery,
  options: FetchOptions,
): Promise<{ ok: true; status: number; body: unknown } | { ok: false; status: number | "network" | "unconfigured" }> {
  const base = resolveApiBase(options.env);
  if (!base) return { ok: false, status: "unconfigured" };
  const fetchFn = options.fetchFn ?? fetch;
  try {
    const response = await fetchFn(path(base, query), { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, status: response.status, body };
  } catch {
    return { ok: false, status: "network" };
  }
}

function parseCoinList(body: unknown): CoinQueryResult | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { items?: unknown; total?: unknown };
  if (!Array.isArray(record.items) || typeof record.total !== "number") return null;
  if (!record.items.every(isCoinListItem)) return null;
  return { items: record.items, total: record.total };
}

function parseApiCoin(body: unknown): ApiCoin | null {
  if (!isCoinListItem(body)) return null;
  const record = body as CoinListItem & { description?: unknown; socials?: unknown; chart?: unknown };
  return {
    ...record,
    backingBasket: parseBasket(record.backingBasket),
    description: typeof record.description === "string" ? record.description : "",
    socials: parseSocials(record.socials),
    chart: Array.isArray(record.chart) ? record.chart.filter(isChartPoint) : [],
  };
}

function parseBasket(value: unknown): BackingLeg[] | null {
  if (!Array.isArray(value)) return null;
  const legs: BackingLeg[] = [];
  for (const entry of value) {
    const leg = entry as { assetKind?: unknown; weightBps?: unknown } | null;
    if (leg && typeof leg.assetKind === "number" && typeof leg.weightBps === "number") {
      legs.push({ assetKind: leg.assetKind, weightBps: leg.weightBps });
    }
  }
  return legs.length > 0 ? legs : null;
}

function parseSocials(value: unknown): CoinSocials {
  if (!value || typeof value !== "object") return EMPTY_SOCIALS;
  const socials = value as Partial<CoinSocials>;
  return {
    website: textOrNull(socials.website),
    twitter: textOrNull(socials.twitter),
    telegram: textOrNull(socials.telegram),
    discord: textOrNull(socials.discord),
  };
}

function isCoinListItem(value: unknown): value is CoinListItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CoinListItem>;
  return (
    typeof row.mint === "string" &&
    typeof row.name === "string" &&
    typeof row.symbol === "string" &&
    typeof row.creator === "string" &&
    typeof row.backing === "string" &&
    isStatus(row.status) &&
    nullableNumber(row.priceUsd) &&
    nullableNumber(row.marketCapUsd) &&
    nullableNumber(row.backingRatioBps) &&
    nullableNumber(row.saleProgressBps) &&
    typeof row.holderCount === "number" &&
    typeof row.launchedAt === "number" &&
    nullableStringField(row.logoUrl) &&
    nullableStringField(row.metadataUri)
  );
}

function isChartPoint(value: unknown): value is ChartPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<ChartPoint>;
  return typeof point.t === "number" && typeof point.priceUsd === "number" && typeof point.volumeUsd === "number";
}

function isStatus(value: unknown): value is LaunchStatus {
  return typeof value === "string" && (LAUNCH_STATUSES as readonly string[]).includes(value);
}

function nullableNumber(value: unknown): boolean {
  return value == null || typeof value === "number";
}

function nullableStringField(value: unknown): boolean {
  return value == null || typeof value === "string";
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
