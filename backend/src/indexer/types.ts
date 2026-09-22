import type { ChartPoint, CoinSocials, LaunchStatus } from "../catalog/types.ts";

export type TokenTransfer = {
  mint: string;
  amount: number;
};

export type ChainTx = {
  slot: bigint;
  signature: string;
  blockTime: number | null;
  logs: string[];
  accountKeys: string[];
  tokenTransfers?: TokenTransfer[];
  err?: unknown;
};

export type LaunchHydration = {
  name: string;
  symbol: string;
  creator: string;
  backing: string;
  status: LaunchStatus;
  metadataUri: string | null;
  logoUrl: string | null;
  description: string;
  socials: CoinSocials;
  launchedAt: number;
  eolConfig: string | null;
  targetRaiseUsdc: bigint | null;
};

export type LaunchHydrateInput = {
  mint: string;
  creator: string;
  eol: string;
  launchId: bigint;
  accountKeys: string[];
  blockTime: number | null;
};

export type LaunchHydrator = {
  hydrate: (input: LaunchHydrateInput) => Promise<LaunchHydration | null>;
};

export type LaunchRecord = LaunchHydration & {
  mint: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  backingRatioBps: number | null;
  saleProgressBps: number | null;
  holderCount: number;
};

export type TokenStats = {
  priceUsd: number | null;
  marketCapUsd: number | null;
  backingRatioBps: number | null;
  saleProgressBps: number | null;
  holderCount: number;
};

export type CursorStore = {
  lastSlot: () => Promise<bigint>;
  advanceTo: (slot: bigint) => Promise<void>;
};

export type IndexWriteStore = {
  upsertLaunch: (launch: LaunchRecord) => Promise<void>;
  setStatus: (mint: string, status: LaunchStatus) => Promise<void>;
  setSaleProgress: (mint: string, saleProgressBps: number) => Promise<void>;
  recordStats: (mint: string, stats: TokenStats, capturedAt: number) => Promise<void>;
  recordPrice: (mint: string, point: ChartPoint) => Promise<void>;
  getLaunch: (mint: string) => Promise<LaunchRecord | null>;
  findMintByAccounts: (accountKeys: string[]) => Promise<string | null>;
};

export type LogSource = {
  currentSlot: () => Promise<bigint>;
  transactionsSince: (lastSlot: bigint) => Promise<ChainTx[]>;
};

export type IngestResult = {
  applied: number;
  lastSlot: bigint;
};

export type Indexer = {
  ingest: (txs: ChainTx[]) => Promise<IngestResult>;
  catchUp: (source: LogSource) => Promise<IngestResult>;
  lastSlot: () => Promise<bigint>;
};
