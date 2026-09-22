export const LAUNCH_STATUSES = [
  "created",
  "wired",
  "sale",
  "active",
  "voided",
  "liquidating",
] as const;

export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

export const COIN_SORT_FIELDS = [
  "launchedAt",
  "marketCapUsd",
  "priceUsd",
  "name",
  "holderCount",
  "saleProgressBps",
] as const;

export type CoinSortField = (typeof COIN_SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export type CoinListItem = {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  backing: string;
  status: LaunchStatus;
  priceUsd: number | null;
  marketCapUsd: number | null;
  backingRatioBps: number | null;
  saleProgressBps: number | null;
  holderCount: number;
  launchedAt: number;
  logoUrl: string | null;
  metadataUri: string | null;
};

export type CoinSocials = {
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
};

export type ChartPoint = {
  t: number;
  priceUsd: number;
  volumeUsd: number;
};

export type IndexedCoin = CoinListItem & {
  description: string;
  socials: CoinSocials;
};

export type CoinQuery = {
  search?: string;
  status?: LaunchStatus | LaunchStatus[];
  backing?: string;
  sort?: CoinSortField;
  dir?: SortDir;
  limit?: number;
  offset?: number;
};

export type CoinQueryResult = {
  items: CoinListItem[];
  total: number;
};

export type HeldAccount = {
  mint: string;
  amount: number;
};

export type HeldCoin = CoinListItem & { amount: number };
