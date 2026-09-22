import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import { createIndexer } from "./ingest.ts";
import { createMemoryCursor, createMemoryWrites } from "./memory.ts";
import type { ChainTx, LaunchHydration, LaunchHydrator } from "./types.ts";

function eventDisc(name: string): Buffer {
  return createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
}

function pubkey(seed: number): { bytes: Buffer; base58: string } {
  const bytes = Buffer.alloc(32, 0);
  bytes[0] = seed;
  bytes[31] = seed;
  return { bytes, base58: encodeBase58(bytes) };
}

const creator = pubkey(1);
const mint = pubkey(2);
const eol = pubkey(3);
const staking = pubkey(4);
const vesting = pubkey(5);
const escrow = pubkey(6);

function programData(name: string, payload: Buffer): string {
  return `Program data: ${Buffer.concat([eventDisc(name), payload]).toString("base64")}`;
}

function tokenLaunchedLog(): string {
  const payload = Buffer.concat([
    Buffer.from(new BigUint64Array([1n]).buffer),
    creator.bytes,
    mint.bytes,
    eol.bytes,
    staking.bytes,
    vesting.bytes,
    escrow.bytes,
  ]);
  return programData("TokenLaunched", payload);
}

const helix: LaunchHydration = {
  name: "Helix",
  symbol: "HLX",
  creator: creator.base58,
  backing: "cSOL",
  status: "sale",
  metadataUri: "https://cdn.example/helix.json",
  logoUrl: "https://cdn.example/helix.png",
  description: "",
  socials: { website: null, twitter: null, telegram: null, discord: null },
  launchedAt: 1_700_000_000,
  eolConfig: eol.base58,
  targetRaiseUsdc: 100_000_000_000n,
};

function hydratorWith(snapshot: LaunchHydration): LaunchHydrator {
  return {
    async hydrate(input) {
      if (input.mint !== mint.base58) return null;
      return snapshot;
    },
  };
}

function tx(partial: Partial<ChainTx> & Pick<ChainTx, "slot" | "signature">): ChainTx {
  return {
    blockTime: 1_700_000_000,
    logs: [],
    accountKeys: [mint.base58, eol.base58],
    ...partial,
  };
}

function u64le(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

function saleLog(name: "SaleVoided" | "SaleFinalized" | "SaleDeposit", payload: Buffer = Buffer.alloc(48)): string {
  return programData(name, payload);
}

function launchTx(slot = 42n): ChainTx {
  return tx({
    slot,
    signature: "sig-launch",
    logs: ["Program factory invoke [1]", tokenLaunchedLog()],
  });
}

async function indexerWithHelix() {
  const cursor = createMemoryCursor();
  const writes = createMemoryWrites();
  const indexer = createIndexer({ cursor, writes, hydrator: hydratorWith(helix) });
  await indexer.ingest([launchTx()]);
  return { cursor, writes, indexer };
}

describe("indexer ingest", () => {
  it("upserts a Factory TokenLaunched launch into the read model and records the slot", async () => {
    const cursor = createMemoryCursor();
    const writes = createMemoryWrites();
    const indexer = createIndexer({ cursor, writes, hydrator: hydratorWith(helix) });

    const result = await indexer.ingest([launchTx()]);

    expect(result).toEqual({ applied: 1, lastSlot: 42n });
    expect(await indexer.lastSlot()).toBe(42n);
    expect(await writes.getLaunch(mint.base58)).toMatchObject({
      mint: mint.base58,
      name: "Helix",
      symbol: "HLX",
      creator: creator.base58,
      backing: "cSOL",
      status: "sale",
      eolConfig: eol.base58,
      launchedAt: 1_700_000_000,
    });
  });

  it("does not invent a launch when the hydrator cannot prove it on-chain", async () => {
    const writes = createMemoryWrites();
    const indexer = createIndexer({
      cursor: createMemoryCursor(),
      writes,
      hydrator: { hydrate: async () => null },
    });

    const result = await indexer.ingest([launchTx()]);

    expect(result.applied).toBe(0);
    expect(await writes.getLaunch(mint.base58)).toBeNull();
    expect(await indexer.lastSlot()).toBe(42n);
  });

  it("re-ingesting the same TokenLaunched tx is idempotent", async () => {
    const { indexer, writes } = await indexerWithHelix();

    await indexer.ingest([launchTx()]);

    expect(await writes.list()).toHaveLength(1);
    expect((await writes.getLaunch(mint.base58))?.symbol).toBe("HLX");
  });

  it("does not wipe price history when TokenLaunched is replayed after a swap", async () => {
    const { indexer, writes } = await indexerWithHelix();
    const usdc = pubkey(8);
    await indexer.ingest([
      tx({
        slot: 80n,
        signature: "sig-swap",
        blockTime: 1_700_000_100,
        tokenTransfers: [
          { mint: mint.base58, amount: 10 },
          { mint: usdc.base58, amount: 25 },
        ],
      }),
    ]);

    await indexer.ingest([launchTx(90n)]);

    expect((await writes.getLaunch(mint.base58))?.priceUsd).toBe(2.5);
    expect(await writes.chart(mint.base58)).toEqual([{ t: 1_700_000_100, priceUsd: 2.5, volumeUsd: 25 }]);
  });

  it("marks a known mint voided from SaleVoided and active from SaleFinalized", async () => {
    const { indexer, writes } = await indexerWithHelix();

    await indexer.ingest([
      tx({ slot: 50n, signature: "sig-void", logs: [saleLog("SaleVoided")] }),
    ]);
    expect((await writes.getLaunch(mint.base58))?.status).toBe("voided");

    await indexer.ingest([
      tx({ slot: 51n, signature: "sig-fin", logs: [saleLog("SaleFinalized")] }),
    ]);
    expect((await writes.getLaunch(mint.base58))?.status).toBe("active");
  });

  it("writes sale progress from SaleDeposit against the snapshotted target raise", async () => {
    const { indexer, writes } = await indexerWithHelix();
    const payload = Buffer.concat([pubkey(9).bytes, u64le(40_000_000_000n), u64le(40_000_000_000n)]);

    await indexer.ingest([
      tx({ slot: 43n, signature: "sig-dep", logs: [saleLog("SaleDeposit", payload)] }),
    ]);

    expect((await writes.getLaunch(mint.base58))?.saleProgressBps).toBe(4000);
  });

  it("does not apply SaleVoided to a mint that is not already indexed", async () => {
    const writes = createMemoryWrites();
    const indexer = createIndexer({
      cursor: createMemoryCursor(),
      writes,
      hydrator: hydratorWith(helix),
    });

    await indexer.ingest([
      tx({ slot: 7n, signature: "sig-orphan", logs: [saleLog("SaleVoided")] }),
    ]);

    expect(await writes.getLaunch(mint.base58)).toBeNull();
  });

  it("skips failed transactions and ignores logs that are not Transmuter events", async () => {
    const { indexer, writes } = await indexerWithHelix();

    await indexer.ingest([
      tx({ slot: 60n, signature: "sig-fail", err: { InstructionError: [0, "Custom"] }, logs: [saleLog("SaleVoided")] }),
      tx({ slot: 61n, signature: "sig-noise", logs: ["Program log: hello"] }),
    ]);

    expect((await writes.getLaunch(mint.base58))?.status).toBe("sale");
    expect(await indexer.lastSlot()).toBe(61n);
  });

  it("never moves lastSlot backwards when a late webhook arrives", async () => {
    const { indexer } = await indexerWithHelix();

    await indexer.ingest([tx({ slot: 10n, signature: "sig-late", logs: ["Program log: late"] })]);

    expect(await indexer.lastSlot()).toBe(42n);
  });

  it("records a price/volume point when a known mint swaps against another token", async () => {
    const { indexer, writes } = await indexerWithHelix();
    const usdc = pubkey(8);

    await indexer.ingest([
      tx({
        slot: 80n,
        signature: "sig-swap",
        blockTime: 1_700_000_100,
        tokenTransfers: [
          { mint: mint.base58, amount: 10 },
          { mint: usdc.base58, amount: 25 },
        ],
      }),
    ]);

    expect(await writes.chart(mint.base58)).toEqual([{ t: 1_700_000_100, priceUsd: 2.5, volumeUsd: 25 }]);
    expect((await writes.getLaunch(mint.base58))?.priceUsd).toBe(2.5);
    expect(writes.stats(mint.base58)).toEqual([
      expect.objectContaining({ capturedAt: 1_700_000_100, priceUsd: 2.5 }),
    ]);
  });

  it("catch-up replays from the last slot so downtime does not drop txs", async () => {
    const { indexer, writes } = await indexerWithHelix();
    const seen: bigint[] = [];

    const result = await indexer.catchUp({
      async currentSlot() {
        return 70n;
      },
      async transactionsSince(lastSlot) {
        seen.push(lastSlot);
        return [
          tx({ slot: 42n, signature: "sig-launch", logs: [tokenLaunchedLog()] }),
          tx({ slot: 55n, signature: "sig-void", logs: [saleLog("SaleVoided")] }),
        ];
      },
    });

    expect(seen).toEqual([42n]);
    expect(result).toEqual({ applied: 2, lastSlot: 70n });
    expect((await writes.getLaunch(mint.base58))?.status).toBe("voided");
  });
});
