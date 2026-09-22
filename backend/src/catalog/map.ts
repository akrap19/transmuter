import { LAUNCH_STATUSES, type ChartPoint, type CoinListItem, type IndexedCoin, type LaunchStatus } from "./types.ts";

export type LaunchRow = {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  backing: string;
  status: string;
  metadataUri: string | null;
  logoUrl: string | null;
  description: string;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  launchedAt: number;
  priceUsd: unknown;
  marketCapUsd: unknown;
  backingRatioBps: number | null;
  saleProgressBps: number | null;
  holderCount: number;
};

export type PriceRow = {
  t: number;
  priceUsd: unknown;
  volumeUsd: unknown;
};

function asStatus(value: string): LaunchStatus {
  if ((LAUNCH_STATUSES as readonly string[]).includes(value)) {
    return value as LaunchStatus;
  }
  throw new Error(`unknown launch status: ${value}`);
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toListItem(row: LaunchRow): CoinListItem {
  return {
    mint: row.mint,
    name: row.name,
    symbol: row.symbol,
    creator: row.creator,
    backing: row.backing,
    status: asStatus(row.status),
    priceUsd: toNumber(row.priceUsd),
    marketCapUsd: toNumber(row.marketCapUsd),
    backingRatioBps: row.backingRatioBps,
    saleProgressBps: row.saleProgressBps,
    holderCount: row.holderCount,
    launchedAt: row.launchedAt,
    logoUrl: row.logoUrl,
    metadataUri: row.metadataUri,
  };
}

export function toIndexedCoin(row: LaunchRow): IndexedCoin {
  return {
    ...toListItem(row),
    description: row.description,
    socials: {
      website: row.website,
      twitter: row.twitter,
      telegram: row.telegram,
      discord: row.discord,
    },
  };
}

export function toChartPoint(row: PriceRow): ChartPoint {
  return {
    t: row.t,
    priceUsd: toNumber(row.priceUsd) ?? 0,
    volumeUsd: toNumber(row.volumeUsd) ?? 0,
  };
}
