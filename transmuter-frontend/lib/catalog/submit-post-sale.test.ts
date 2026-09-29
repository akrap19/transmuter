import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { claimPlan, finalizePlan } from "./post-sale-accounts";
import { submitPostSale, type EolPostSaleClient, type PostSaleChain } from "./submit-post-sale";

const mint = Keypair.generate().publicKey;
const cranker = Keypair.generate().publicKey;
const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

describe("submitPostSale", () => {
  it("finalizes through the mock DEX pools with the finalize compute budget", async () => {
    const { eol, finalize, accounts } = client();
    const send = vi.fn().mockResolvedValue({ signature: "fin", explorerUrl: "https://explorer.solana.com/tx/fin?cluster=devnet" });
    const chain = fixture();

    const result = await submitPostSale({
      kind: "finalize",
      chain,
      eol,
      connection: {} as never,
      signer: { publicKey: cranker, signTransaction: async (tx) => tx },
      send,
    });

    expect(finalize).toHaveBeenCalled();
    expect(accounts).toHaveBeenCalledWith(finalizePlan(chain).accounts);
    const tx = send.mock.calls[0][0].transaction as Transaction;
    expect(tx.instructions[0]?.programId.equals(ComputeBudgetProgram.programId)).toBe(true);
    expect(result.signature).toBe("fin");
  });

  it("creates the participant token account and claims the sale vault", async () => {
    const { eol, claim, accounts } = client();
    const send = vi.fn().mockResolvedValue({ signature: "claim", explorerUrl: "https://explorer.solana.com/tx/claim?cluster=devnet" });
    const chain = fixture();

    await submitPostSale({
      kind: "claimTokens",
      chain,
      eol,
      connection: {} as never,
      signer: { publicKey: cranker, signTransaction: async (tx) => tx },
      send,
    });

    const plan = claimPlan({ mint, depositor: cranker, saleTokenVault: chain.saleTokenVault });
    expect(claim).toHaveBeenCalled();
    expect(accounts).toHaveBeenCalledWith(plan.accounts);
    const tx = send.mock.calls[0][0].transaction as Transaction;
    expect(tx.instructions[0]?.keys.map((key) => key.pubkey.toBase58())).toEqual(
      expect.arrayContaining([plan.destination.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()]),
    );
  });

  it("tops up the Raydium LP signer before seeding the USDC pool", async () => {
    const { eol, seed } = client();
    const send = vi.fn().mockResolvedValue({ signature: "seed", explorerUrl: "https://explorer.solana.com/tx/seed?cluster=devnet" });
    const chain = fixture({ lpTokenAtoms: BigInt(1_000), saleUsdcAtoms: BigInt(9), lpUsdcShareBps: 2_500, lpSignerLamports: BigInt(0) });

    await submitPostSale({
      kind: "seedRaydiumUsdc",
      chain,
      eol,
      connection: {} as never,
      signer: { publicKey: cranker, signTransaction: async (tx) => tx },
      send,
    });

    expect(seed.mock.calls[0]?.map((value: { toString(): string }) => value.toString())).toEqual(["250", "9"]);
    const tx = send.mock.calls[0][0].transaction as Transaction;
    const transfer = tx.instructions.find((ix) => ix.programId.equals(SystemProgram.programId));
    expect(transfer?.keys.some((key) => key.pubkey.equals(chain.cranker))).toBe(true);
  });

  it("refuses to finalize when the wired pool vaults are missing", async () => {
    const { eol } = client();
    await expect(
      submitPostSale({
        kind: "finalize",
        chain: fixture({ poolsReady: false }),
        eol,
        connection: {} as never,
        signer: { publicKey: cranker, signTransaction: async (tx) => tx },
        send: vi.fn(),
      }),
    ).rejects.toThrow(/pool vaults/i);
  });
});

function client() {
  const built = new Transaction().add({ keys: [], programId: new PublicKey(PROGRAM_IDS.eolToken), data: Buffer.from([1]) });
  const accounts = vi.fn().mockReturnValue({
    remainingAccounts: vi.fn().mockReturnValue({ transaction: vi.fn().mockResolvedValue(built) }),
    transaction: vi.fn().mockResolvedValue(built),
  });
  const finalize = vi.fn().mockReturnValue({ accounts });
  const convert = vi.fn().mockReturnValue({ accounts });
  const seed = vi.fn().mockReturnValue({ accounts });
  const claim = vi.fn().mockReturnValue({ accounts });
  const eol: EolPostSaleClient = { methods: { finalize, convertTreasury: convert, seedRaydiumLp: seed, claimTokens: claim } };
  return { eol, finalize, convert, seed, claim, accounts };
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
    ...overrides,
  };
}
