import { decodeLogs } from "./decode.ts";
import type {
  ChainTx,
  CursorStore,
  Indexer,
  IndexWriteStore,
  IngestResult,
  LaunchHydrator,
  LaunchRecord,
  LogSource,
} from "./types.ts";

export type { Indexer };

export type IndexerDeps = {
  cursor: CursorStore;
  writes: IndexWriteStore;
  hydrator: LaunchHydrator;
};

function saleProgressBps(raised: bigint, target: bigint | null): number | null {
  if (target == null || target <= 0n) return null;
  const bps = Number((raised * 10_000n) / target);
  if (!Number.isFinite(bps)) return null;
  return Math.max(0, Math.min(10_000, bps));
}

async function applyTx(
  tx: ChainTx,
  writes: IndexWriteStore,
  hydrator: LaunchHydrator,
): Promise<number> {
  if (tx.err) return 0;
  const events = decodeLogs(tx.logs);
  let applied = 0;

  for (const event of events) {
    if (event.kind === "tokenLaunched") {
      const snapshot = await hydrator.hydrate({
        mint: event.mint,
        creator: event.creator,
        eol: event.eol,
        launchId: event.launchId,
        accountKeys: tx.accountKeys,
        blockTime: tx.blockTime,
      });
      if (!snapshot) continue;
      const launch: LaunchRecord = {
        ...snapshot,
        mint: event.mint,
        creator: snapshot.creator || event.creator,
        eolConfig: snapshot.eolConfig ?? event.eol,
        priceUsd: null,
        marketCapUsd: null,
        backingRatioBps: null,
        saleProgressBps: null,
        holderCount: 0,
      };
      await writes.upsertLaunch(launch);
      applied++;
      continue;
    }

    const mint = await writes.findMintByAccounts(tx.accountKeys);
    if (!mint) continue;

    if (event.kind === "saleVoided") {
      await writes.setStatus(mint, "voided");
      applied++;
    } else if (event.kind === "saleFinalized") {
      await writes.setStatus(mint, "active");
      applied++;
    } else if (event.kind === "saleDeposit") {
      const launch = await writes.getLaunch(mint);
      const progress = saleProgressBps(event.totalRaisedUsdc, launch?.targetRaiseUsdc ?? null);
      if (progress == null) continue;
      await writes.setSaleProgress(mint, progress);
      applied++;
    }
  }

  if (tx.tokenTransfers && tx.blockTime != null) {
    applied += await applyPrice(tx, writes);
  }

  return applied;
}

async function applyPrice(tx: ChainTx, writes: IndexWriteStore): Promise<number> {
  const transfers = tx.tokenTransfers ?? [];
  if (transfers.length === 0 || tx.blockTime == null) return 0;
  const mint = await writes.findMintByAccounts(transfers.map((item) => item.mint));
  if (!mint) return 0;
  const token = transfers.find((item) => item.mint === mint);
  const usdc = transfers.find((item) => item.mint !== mint);
  if (!token || !usdc || token.amount <= 0) return 0;
  const priceUsd = usdc.amount / token.amount;
  if (!Number.isFinite(priceUsd) || priceUsd < 0) return 0;
  await writes.recordPrice(mint, {
    t: tx.blockTime,
    priceUsd,
    volumeUsd: usdc.amount,
  });
  const launch = await writes.getLaunch(mint);
  await writes.recordStats(
    mint,
    {
      priceUsd,
      marketCapUsd: launch?.marketCapUsd ?? null,
      backingRatioBps: launch?.backingRatioBps ?? null,
      saleProgressBps: launch?.saleProgressBps ?? null,
      holderCount: launch?.holderCount ?? 0,
    },
    tx.blockTime,
  );
  return 1;
}

export function createIndexer(deps: IndexerDeps): Indexer {
  const { cursor, writes, hydrator } = deps;

  return {
    async ingest(txs: ChainTx[]): Promise<IngestResult> {
      const ordered = [...txs].sort((a, b) => {
        if (a.slot === b.slot) return a.signature.localeCompare(b.signature);
        return a.slot < b.slot ? -1 : 1;
      });

      let applied = 0;
      let maxSlot = await cursor.lastSlot();

      for (const tx of ordered) {
        applied += await applyTx(tx, writes, hydrator);
        if (tx.slot > maxSlot) maxSlot = tx.slot;
      }

      await cursor.advanceTo(maxSlot);
      return { applied, lastSlot: await cursor.lastSlot() };
    },
    async catchUp(source: LogSource): Promise<IngestResult> {
      const from = await cursor.lastSlot();
      const txs = await source.transactionsSince(from);
      const result = await this.ingest(txs);
      const head = await source.currentSlot();
      if (head > result.lastSlot) {
        await cursor.advanceTo(head);
      }
      return { applied: result.applied, lastSlot: await cursor.lastSlot() };
    },
    lastSlot: () => cursor.lastSlot(),
  };
}
