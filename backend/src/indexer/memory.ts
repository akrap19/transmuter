import { toIndexedCoin, toListItem } from "../catalog/map.ts";
import type { CatalogStore } from "../catalog/store.ts";
import type { ChartPoint, CoinListItem, IndexedCoin, LaunchStatus } from "../catalog/types.ts";
import type { CursorStore, IndexWriteStore, LaunchRecord, TokenStats } from "./types.ts";

export function createMemoryCursor(initial = 0n): CursorStore {
  let lastSlot = initial;
  return {
    async lastSlot() {
      return lastSlot;
    },
    async advanceTo(slot) {
      if (slot > lastSlot) lastSlot = slot;
    },
  };
}

export type MemoryIndex = IndexWriteStore &
  CatalogStore & {
    stats: (mint: string) => TokenStats[];
  };

export function createMemoryWrites(initial: LaunchRecord[] = []): MemoryIndex {
  const byMint = new Map(initial.map((row) => [row.mint, { ...row }]));
  const charts = new Map<string, ChartPoint[]>();
  const snapshots = new Map<string, Array<TokenStats & { capturedAt: number }>>();

  function row(mint: string): LaunchRecord | undefined {
    return byMint.get(mint);
  }

  return {
    async upsertLaunch(launch) {
      const existing = byMint.get(launch.mint);
      byMint.set(launch.mint, {
        ...existing,
        ...launch,
        priceUsd: launch.priceUsd ?? existing?.priceUsd ?? null,
        marketCapUsd: launch.marketCapUsd ?? existing?.marketCapUsd ?? null,
        backingRatioBps: launch.backingRatioBps ?? existing?.backingRatioBps ?? null,
        saleProgressBps: launch.saleProgressBps ?? existing?.saleProgressBps ?? null,
        holderCount: launch.holderCount || existing?.holderCount || 0,
      });
    },
    async setStatus(mint, status: LaunchStatus) {
      const current = row(mint);
      if (!current) return;
      byMint.set(mint, { ...current, status });
    },
    async setSaleProgress(mint, saleProgressBps) {
      const current = row(mint);
      if (!current) return;
      byMint.set(mint, { ...current, saleProgressBps });
    },
    async recordStats(mint, stats, capturedAt) {
      const current = row(mint);
      if (!current) return;
      byMint.set(mint, { ...current, ...stats });
      const list = snapshots.get(mint) ?? [];
      const existing = list.findIndex((item) => item.capturedAt === capturedAt);
      const next = { ...stats, capturedAt };
      if (existing >= 0) list[existing] = next;
      else list.push(next);
      snapshots.set(mint, list);
    },
    async recordPrice(mint, point) {
      if (!row(mint)) return;
      const list = charts.get(mint) ?? [];
      const existing = list.findIndex((item) => item.t === point.t);
      if (existing >= 0) list[existing] = point;
      else list.push(point);
      list.sort((a, b) => a.t - b.t);
      charts.set(mint, list);
      const current = row(mint);
      if (current) byMint.set(mint, { ...current, priceUsd: point.priceUsd });
    },
    async getLaunch(mint) {
      const current = row(mint);
      return current ? { ...current } : null;
    },
    async findMintByAccounts(accountKeys) {
      for (const key of accountKeys) {
        if (byMint.has(key)) return key;
      }
      for (const launch of byMint.values()) {
        if (launch.eolConfig && accountKeys.includes(launch.eolConfig)) return launch.mint;
      }
      return null;
    },
    async list(): Promise<CoinListItem[]> {
      return [...byMint.values()].map((launch) => toListItem(toRow(launch)));
    },
    async get(mint): Promise<IndexedCoin | null> {
      const launch = row(mint);
      return launch ? toIndexedCoin(toRow(launch)) : null;
    },
    async chart(mint) {
      return [...(charts.get(mint) ?? [])];
    },
    stats(mint) {
      return [...(snapshots.get(mint) ?? [])];
    },
  };
}

function toRow(launch: LaunchRecord) {
  return {
    mint: launch.mint,
    name: launch.name,
    symbol: launch.symbol,
    creator: launch.creator,
    backing: launch.backing,
    status: launch.status,
    metadataUri: launch.metadataUri,
    logoUrl: launch.logoUrl,
    description: launch.description,
    website: launch.socials.website,
    twitter: launch.socials.twitter,
    telegram: launch.socials.telegram,
    discord: launch.socials.discord,
    launchedAt: launch.launchedAt,
    priceUsd: launch.priceUsd,
    marketCapUsd: launch.marketCapUsd,
    backingRatioBps: launch.backingRatioBps,
    saleProgressBps: launch.saleProgressBps,
    holderCount: launch.holderCount,
  };
}
