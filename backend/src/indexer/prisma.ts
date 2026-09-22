import type { Prisma, PrismaClient } from "@prisma/client";
import type { ChartPoint, LaunchStatus } from "../catalog/types.ts";
import type { CursorStore, IndexWriteStore, LaunchRecord, TokenStats } from "./types.ts";

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRecord(row: {
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
  eolConfig: string | null;
  targetRaiseUsdc: bigint | null;
  priceUsd: unknown;
  marketCapUsd: unknown;
  backingRatioBps: number | null;
  saleProgressBps: number | null;
  holderCount: number;
}): LaunchRecord {
  return {
    mint: row.mint,
    name: row.name,
    symbol: row.symbol,
    creator: row.creator,
    backing: row.backing,
    status: row.status as LaunchStatus,
    metadataUri: row.metadataUri,
    logoUrl: row.logoUrl,
    description: row.description,
    socials: {
      website: row.website,
      twitter: row.twitter,
      telegram: row.telegram,
      discord: row.discord,
    },
    launchedAt: row.launchedAt,
    eolConfig: row.eolConfig,
    targetRaiseUsdc: row.targetRaiseUsdc,
    priceUsd: asNumber(row.priceUsd),
    marketCapUsd: asNumber(row.marketCapUsd),
    backingRatioBps: row.backingRatioBps,
    saleProgressBps: row.saleProgressBps,
    holderCount: row.holderCount,
  };
}

function launchCreate(launch: LaunchRecord): Prisma.LaunchCreateInput {
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
    eolConfig: launch.eolConfig,
    targetRaiseUsdc: launch.targetRaiseUsdc,
    priceUsd: launch.priceUsd,
    marketCapUsd: launch.marketCapUsd,
    backingRatioBps: launch.backingRatioBps,
    saleProgressBps: launch.saleProgressBps,
    holderCount: launch.holderCount,
  };
}

function launchUpdate(launch: LaunchRecord): Prisma.LaunchUpdateInput {
  const update: Prisma.LaunchUpdateInput = {
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
    eolConfig: launch.eolConfig,
    targetRaiseUsdc: launch.targetRaiseUsdc,
  };
  if (launch.priceUsd != null) update.priceUsd = launch.priceUsd;
  if (launch.marketCapUsd != null) update.marketCapUsd = launch.marketCapUsd;
  if (launch.backingRatioBps != null) update.backingRatioBps = launch.backingRatioBps;
  if (launch.saleProgressBps != null) update.saleProgressBps = launch.saleProgressBps;
  if (launch.holderCount) update.holderCount = launch.holderCount;
  return update;
}

export function createPrismaCursor(prisma: PrismaClient): CursorStore {
  return {
    async lastSlot() {
      const row = await prisma.indexerCursor.findUnique({ where: { id: 1 } });
      return row?.lastSlot ?? 0n;
    },
    async advanceTo(slot) {
      await prisma.indexerCursor.upsert({
        where: { id: 1 },
        create: { id: 1, lastSlot: slot },
        update: {},
      });
      await prisma.$executeRaw`UPDATE indexer_cursor SET last_slot = GREATEST(last_slot, ${slot}) WHERE id = 1`;
    },
  };
}

export function createPrismaWrites(prisma: PrismaClient): IndexWriteStore {
  return {
    async upsertLaunch(launch) {
      await prisma.launch.upsert({
        where: { mint: launch.mint },
        create: launchCreate(launch),
        update: launchUpdate(launch),
      });
    },
    async setStatus(mint, status) {
      await prisma.launch.updateMany({ where: { mint }, data: { status } });
    },
    async setSaleProgress(mint, saleProgressBps) {
      await prisma.launch.updateMany({ where: { mint }, data: { saleProgressBps } });
    },
    async recordStats(mint, stats: TokenStats, capturedAt: number) {
      const exists = await prisma.launch.findUnique({ where: { mint }, select: { mint: true } });
      if (!exists) return;
      await prisma.launch.update({
        where: { mint },
        data: {
          priceUsd: stats.priceUsd,
          marketCapUsd: stats.marketCapUsd,
          backingRatioBps: stats.backingRatioBps,
          saleProgressBps: stats.saleProgressBps,
          holderCount: stats.holderCount,
        },
      });
      await prisma.tokenStat.upsert({
        where: { mint_capturedAt: { mint, capturedAt } },
        create: {
          mint,
          capturedAt,
          priceUsd: stats.priceUsd,
          marketCapUsd: stats.marketCapUsd,
          backingRatioBps: stats.backingRatioBps,
          saleProgressBps: stats.saleProgressBps,
          holderCount: stats.holderCount,
        },
        update: {
          priceUsd: stats.priceUsd,
          marketCapUsd: stats.marketCapUsd,
          backingRatioBps: stats.backingRatioBps,
          saleProgressBps: stats.saleProgressBps,
          holderCount: stats.holderCount,
        },
      });
    },
    async recordPrice(mint, point: ChartPoint) {
      const exists = await prisma.launch.findUnique({ where: { mint }, select: { mint: true } });
      if (!exists) return;
      await prisma.priceHistory.upsert({
        where: { mint_t: { mint, t: point.t } },
        create: { mint, t: point.t, priceUsd: point.priceUsd, volumeUsd: point.volumeUsd },
        update: { priceUsd: point.priceUsd, volumeUsd: point.volumeUsd },
      });
      await prisma.launch.update({
        where: { mint },
        data: { priceUsd: point.priceUsd },
      });
    },
    async getLaunch(mint) {
      const row = await prisma.launch.findUnique({ where: { mint } });
      return row ? toRecord(row) : null;
    },
    async findMintByAccounts(accountKeys) {
      if (accountKeys.length === 0) return null;
      const row = await prisma.launch.findFirst({
        where: { OR: [{ mint: { in: accountKeys } }, { eolConfig: { in: accountKeys } }] },
        select: { mint: true },
      });
      return row?.mint ?? null;
    },
  };
}
