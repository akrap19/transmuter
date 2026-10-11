import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import type { FactoryOutcomeClient, PostSaleChain } from "./submit-post-sale";
import { buildBatch, runPostSale, submitPostSaleBatch, type BatchClient, type StepEvent } from "./submit-post-sale-batch";
import { BatchSigningUnsupported, ChainTransactionError } from "@/lib/solana/tx";

const mint = Keypair.generate().publicKey;
const cranker = Keypair.generate().publicKey;
const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

describe("buildBatch", () => {
  it("finalizes, seeds both pools, converts, then claims in that order", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const txs = await buildBatch(batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500, depositAtoms: BigInt(7) }) }));

    const order = [h.finalize, h.seed, h.seed, h.convert].map((fn, i) => fn.mock.invocationCallOrder[i === 2 ? 1 : 0]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // finalize, seed USDC, seed SOL, then convert with the claim packed behind it
    expect(txs).toHaveLength(4);
    expect(h.claim).toHaveBeenCalledTimes(1);
  });

  it("sizes the seeds from the simulated post-finalize vaults at the exact amounts", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    await buildBatch(batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500 }) }));

    const amounts = h.seed.mock.calls.map((call) => call.map((value: { toString(): string }) => value.toString()));
    expect(amounts).toEqual([
      ["250", "500"],
      ["750", "2000"],
    ]);
  });

  it("tops up the LP signer once, not for every pool", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const txs = await buildBatch(
      batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500, lpSignerLamports: BigInt(0) }) }),
    );

    const funds = txs.map((tx) => tx.instructions.filter((ix) => ix.programId.equals(SystemProgram.programId)).length);
    expect(funds).toEqual([0, 1, 0, 0]);
  });

  it("skips the pool seeds on the mock DEX, where finalize adds the liquidity itself", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 0, wsol: 0 });
    const txs = await buildBatch(batch(h, { chain: fixture({ venue: "mock" }) }));

    expect(txs).toHaveLength(2);
    expect(h.seed).not.toHaveBeenCalled();
    expect(h.convert).toHaveBeenCalledTimes(1);
  });

  it("sends only finalize when the sale voids, so nothing is seeded into a dead launch", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000, status: 2 });
    const txs = await buildBatch(batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500, depositAtoms: BigInt(7) }) }));

    expect(txs).toHaveLength(1);
    expect(h.seed).not.toHaveBeenCalled();
    expect(h.convert).not.toHaveBeenCalled();
  });

  it("stops before the wallet is asked when the finalize simulation fails", async () => {
    const h = harness({ lp: 0, saleUsdc: 0, wsol: 0, err: { InstructionError: [1, { Custom: 6001 }] } });
    const send = vi.fn();

    await expect(submitPostSaleBatch({ ...batch(h, { chain: fixture({ venue: "raydium" }) }), send })).rejects.toThrow(/rejected/i);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not guess the sale status when the simulated config is missing", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    h.simulate.mockResolvedValueOnce({ value: { err: null, logs: [], accounts: [tokenAccount(1), tokenAccount(1), tokenAccount(1), null] } });

    await expect(buildBatch(batch(h, { chain: fixture({ venue: "raydium" }) }))).rejects.toThrow(/could not read the sale status/i);
  });

  it("finishes only the open jobs, seeds before convert, from the chain as it is", async () => {
    const h = harness({ lp: 0, saleUsdc: 0, wsol: 0 });
    const chain = fixture({ venue: "raydium", lpUsdcShareBps: 2_500, lpTokenAtoms: BigInt(1_000), saleUsdcAtoms: BigInt(9), wsolAtoms: BigInt(4) });
    const txs = await buildBatch(batch(h, { mode: "setup", steps: ["convertTreasury", "seedRaydiumWsol", "seedRaydiumUsdc"], chain }));

    expect(txs).toHaveLength(3);
    expect(h.seed.mock.calls.map((call) => call[0].toString())).toEqual(["250", "750"]);
    expect(h.seed.mock.invocationCallOrder[1]).toBeLessThan(h.convert.mock.invocationCallOrder[0]);
    expect(h.finalize).not.toHaveBeenCalled();
    expect(h.simulate).not.toHaveBeenCalled();
  });

  it("refuses a setup run with nothing left to do", async () => {
    const h = harness({ lp: 0, saleUsdc: 0, wsol: 0 });
    await expect(buildBatch(batch(h, { mode: "setup", steps: [], chain: fixture() }))).rejects.toThrow(/nothing is left/i);
  });
});

describe("submitPostSaleBatch", () => {
  it("hands every transaction to one signing call", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const send = vi.fn().mockResolvedValue([{ signature: "a", explorerUrl: "x" }]);

    await submitPostSaleBatch({ ...batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500 }) }), send });

    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][0].transactions as Transaction[]).length).toBe(4);
    const first = (send.mock.calls[0][0].transactions as Transaction[])[0];
    expect(first.instructions[0]?.programId.equals(ComputeBudgetProgram.programId)).toBe(true);
  });
});

function harness(after: { lp: number; saleUsdc: number; wsol: number; status?: number; err?: unknown }) {
  const built = () => new Transaction().add({ keys: [], programId: new PublicKey(PROGRAM_IDS.eolToken), data: Buffer.from([1]) });
  const synced = new Transaction().add({ keys: [], programId: new PublicKey(PROGRAM_IDS.factory), data: Buffer.from([2]) });
  const method = () => {
    const accounts = vi.fn().mockReturnValue({
      remainingAccounts: vi.fn().mockReturnValue({ transaction: vi.fn().mockImplementation(async () => built()) }),
      transaction: vi.fn().mockImplementation(async () => built()),
    });
    return vi.fn().mockReturnValue({ accounts });
  };
  const finalize = method();
  const convert = method();
  const seed = method();
  const claim = method();
  const settle = method();
  const syncAccounts = vi.fn().mockReturnValue({
    remainingAccounts: vi.fn().mockReturnValue({ transaction: vi.fn().mockResolvedValue(synced) }),
    transaction: vi.fn().mockResolvedValue(synced),
  });
  const eol: BatchClient = {
    methods: { finalize, convertTreasury: convert, seedRaydiumLp: seed, claimTokens: claim, settleTransferFees: settle },
    coder: { accounts: { decode: () => ({ status: after.status ?? 1 }) } },
  };
  const factory: FactoryOutcomeClient = {
    methods: {
      syncOutcome: vi.fn().mockReturnValue({ accounts: syncAccounts }),
      initBackingFeeSinks: vi.fn().mockReturnValue({ accounts: syncAccounts }),
      syncFeeRoute: vi.fn().mockReturnValue({ accounts: syncAccounts }),
    },
    account: { mintIndex: { fetchNullable: vi.fn().mockResolvedValue({ launchId: { toString: () => "3" } }) } },
  };
  const simulate = vi.fn().mockResolvedValue({
    value: {
      err: after.err ?? null,
      logs: [],
      accounts: [tokenAccount(after.lp), tokenAccount(after.saleUsdc), tokenAccount(after.wsol), { data: [Buffer.alloc(8).toString("base64"), "base64"] }],
    },
  });
  const connection = {
    simulateTransaction: simulate,
    getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 9 }),
  };
  return { eol, factory, connection, simulate, finalize, convert, seed, claim };
}

function batch(h: ReturnType<typeof harness>, overrides: Partial<Parameters<typeof submitPostSaleBatch>[0]> & { chain: PostSaleChain }) {
  return {
    mode: "finalize" as const,
    eol: h.eol,
    factory: h.factory,
    connection: h.connection as never,
    signer: { publicKey: cranker, signTransaction: async (tx: unknown) => tx } as never,
    ...overrides,
  };
}

function tokenAccount(amount: number) {
  const data = Buffer.alloc(165);
  data.writeBigUInt64LE(BigInt(amount), 64);
  return { data: [data.toString("base64"), "base64"] };
}

function fixture(overrides: Partial<PostSaleChain> = {}): PostSaleChain {
  return {
    cranker,
    mint,
    usdcMint: usdc,
    ctokenMint: Keypair.generate().publicKey,
    saleUsdcVault: Keypair.generate().publicKey,
    saleTokenVault: Keypair.generate().publicKey,
    lpTokenVault: Keypair.generate().publicKey,
    treasuryUsdc: Keypair.generate().publicKey,
    protocolRevenueWallet: Keypair.generate().publicKey,
    feeVault: Keypair.generate().publicKey,
    fallbackCtoken: Keypair.generate().publicKey,
    poolVaultA: Keypair.generate().publicKey,
    poolVaultB: Keypair.generate().publicKey,
    nativeVault: Keypair.generate().publicKey,
    escrow: SystemProgram.programId,
    escrowVault: SystemProgram.programId,
    vesting: SystemProgram.programId,
    venue: "mock",
    lpUsdcShareBps: 0,
    lpTokenAtoms: BigInt(0),
    saleUsdcAtoms: BigInt(0),
    wsolAtoms: BigInt(0),
    depositAtoms: BigInt(0),
    wsolAtaExists: true,
    lpSignerLamports: BigInt(3_000_000_000),
    poolsReady: true,
    eolPoolReady: true,
    feeRouteExists: true,
    launchId: BigInt(1),
    ...overrides,
  };
}

describe("runPostSale", () => {
  it("uses one approval and never falls back when the wallet signs the batch", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const sendAll = vi.fn().mockResolvedValue([{ signature: "a", explorerUrl: "x" }]);
    const sendOne = vi.fn();
    const onFallback = vi.fn();

    await runPostSale({ ...batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500 }) }), sendAll, sendOne, onFallback });

    expect(sendAll).toHaveBeenCalledTimes(1);
    expect(sendOne).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("signs each planned step in order when the wallet cannot sign the batch, and reports each one", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const sendAll = vi.fn().mockRejectedValue(new BatchSigningUnsupported("no batch"));
    const sendOne = vi
      .fn()
      .mockResolvedValueOnce({ signature: "s1", explorerUrl: "x" })
      .mockResolvedValueOnce({ signature: "s2", explorerUrl: "x" })
      .mockResolvedValueOnce({ signature: "s3", explorerUrl: "x" })
      .mockResolvedValueOnce({ signature: "s4", explorerUrl: "x" });
    const events: StepEvent[] = [];
    const kinds: string[][] = [];

    const confirmed = await runPostSale({
      ...batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500 }) }),
      sendAll,
      sendOne,
      onFallback: (planned) => kinds.push(planned),
      onStep: (event) => events.push(event),
    });

    expect(confirmed.map((c) => c.signature)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(kinds).toEqual([["finalize", "seedRaydiumUsdc", "seedRaydiumWsol", "convertTreasury"]]);
    expect(events.filter((e) => e.state === "done").map((e) => e.index)).toEqual([0, 1, 2, 3]);
    // Each planned step is signed on its own: no claim was merged into the convert step.
    expect(sendOne.mock.calls.every((call) => (call[0].transaction as Transaction).instructions.length > 0)).toBe(true);
  });

  it("stops at the failed step and names it, keeping the earlier signatures on the error", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const sendAll = vi.fn().mockRejectedValue(new BatchSigningUnsupported("no batch"));
    const sendOne = vi
      .fn()
      .mockResolvedValueOnce({ signature: "s1", explorerUrl: "x" })
      .mockRejectedValueOnce(new Error("Transaction cancelled in the wallet."));
    const events: StepEvent[] = [];

    const error = await runPostSale({
      ...batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500 }) }),
      sendAll,
      sendOne,
      onStep: (event) => events.push(event),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ChainTransactionError);
    expect((error as Error).message).toMatch(/^Step 2 of 4 failed: Transaction cancelled in the wallet\./);
    expect(sendOne).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toMatchObject({ index: 1, state: "failed" });
  });

  it("stops at once when the user cancels the batch, without a step-by-step fallback", async () => {
    const h = harness({ lp: 1_000, saleUsdc: 500, wsol: 2_000 });
    const sendAll = vi.fn().mockRejectedValue(new ChainTransactionError("Transaction cancelled in the wallet."));
    const sendOne = vi.fn();

    await expect(
      runPostSale({ ...batch(h, { chain: fixture({ venue: "raydium", lpUsdcShareBps: 2_500 }) }), sendAll, sendOne }),
    ).rejects.toThrow(/cancelled in the wallet/);
    expect(sendOne).not.toHaveBeenCalled();
  });
});
