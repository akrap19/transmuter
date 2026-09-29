import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import {
  claimPlan,
  convertPlan,
  finalizePlan,
  mockNativePoolPda,
  mockPoolPda,
  readMockPoolVaults,
  readNativePoolVault,
  seedRaydiumPlan,
} from "./post-sale-accounts";

const mint = Keypair.generate().publicKey;
const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const cranker = Keypair.generate().publicKey;
const ctoken = Keypair.generate().publicKey;
const saleUsdc = Keypair.generate().publicKey;
const saleToken = Keypair.generate().publicKey;
const lpToken = Keypair.generate().publicKey;
const treasuryUsdc = Keypair.generate().publicKey;
const vaultA = Keypair.generate().publicKey;
const vaultB = Keypair.generate().publicKey;
const nativeVault = Keypair.generate().publicKey;

describe("post-sale accounts", () => {
  it("reads mock-dex vaults from the pool account body", () => {
    const pool = Buffer.alloc(8 + 32 * 5 + 3);
    vaultA.toBuffer().copy(pool, 8 + 64);
    vaultB.toBuffer().copy(pool, 8 + 96);
    expect(readMockPoolVaults(pool)).toEqual({ vaultA, vaultB });

    const native = Buffer.alloc(8 + 32 * 3 + 1);
    nativeVault.toBuffer().copy(native, 8 + 32);
    expect(readNativePoolVault(native)?.equals(nativeVault)).toBe(true);
    expect(readMockPoolVaults(Buffer.alloc(8))).toBeNull();
  });

  it("builds a mock-dex finalize for the pools wired on the launch", () => {
    const plan = finalizePlan(base({ venue: "mock", escrow: SystemProgram.programId, vesting: SystemProgram.programId }));
    expect(plan.accounts.dexProgram.toBase58()).toBe(PROGRAM_IDS.mockDex);
    expect(plan.accounts.poolUsdc.equals(mockPoolPda(mint, usdc))).toBe(true);
    expect(plan.accounts.nativePool.equals(mockNativePoolPda(usdc))).toBe(true);
    expect(plan.accounts.poolUsdcVaultA.equals(vaultA)).toBe(true);
    expect(plan.accounts.nativeVault.equals(nativeVault)).toBe(true);
    expect(plan.accounts.escrowProgram.equals(SystemProgram.programId)).toBe(true);
    expect(plan.accounts.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(plan.accounts.usdcProgram.equals(TOKEN_PROGRAM_ID)).toBe(true);
    expect(plan.remaining).toEqual([]);
  });

  it("builds treasury conversion against the same mock native pool and the cToken registrar", () => {
    const plan = convertPlan(base({ venue: "mock", escrow: SystemProgram.programId, vesting: SystemProgram.programId }));
    expect(plan.maxIn).toBe("18446744073709551615");
    expect(plan.minOut).toBe("1");
    expect(plan.accounts.ctokenMint.equals(ctoken)).toBe(true);
    expect(plan.accounts.dexProgram.toBase58()).toBe(PROGRAM_IDS.mockDex);
    expect(plan.accounts.nativePool.equals(mockNativePoolPda(usdc))).toBe(true);
    expect(plan.remaining).toEqual([]);
  });

  it("claims the sale-token vault into the depositor Token-2022 account", () => {
    const plan = claimPlan({ mint, depositor: cranker, saleTokenVault: saleToken });
    expect(plan.accounts.depositor.equals(cranker)).toBe(true);
    expect(plan.accounts.saleTokenVault.equals(saleToken)).toBe(true);
    expect(plan.accounts.destination.equals(plan.destination)).toBe(true);
    expect(plan.accounts.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
  });

  it("uses the devnet USDC/WSOL Raydium pool when finalize and convert run there", () => {
    const finalized = finalizePlan(base({ venue: "raydium", escrow: SystemProgram.programId, vesting: SystemProgram.programId }));
    const converted = convertPlan(base({ venue: "raydium", escrow: SystemProgram.programId, vesting: SystemProgram.programId }));
    expect(finalized.accounts.poolUsdc.toBase58()).toBe("2HyNe5a32uVoB4BybXCLak41QrejZLqF9hZM6KBMQ1V2");
    expect(finalized.accounts.nativePool.equals(finalized.accounts.poolUsdc)).toBe(true);
    expect(finalized.remaining).toHaveLength(8);
    expect(finalized.remaining[0]?.pubkey.toBase58()).toBe("7rQ1QFNosMkUCuh7Z7fPbTHvh73b68sQYdirycEzJVuw");
    expect(converted.accounts.nativePool.equals(finalized.accounts.poolUsdc)).toBe(true);
    expect(converted.remaining).toHaveLength(8);
  });

  it("seeds a Raydium CPMM pool with the published devnet authority", () => {
    const plan = seedRaydiumPlan({
      cranker,
      mint,
      quoteMint: usdc,
      quoteVault: saleUsdc,
      tokenVault: lpToken,
      amountToken: BigInt(250),
      amountQuote: BigInt(9),
    });
    expect(plan.accounts.dexProgram.toBase58()).toBe("CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW");
    expect(plan.remaining[1]?.pubkey.toBase58()).toBe("7rQ1QFNosMkUCuh7Z7fPbTHvh73b68sQYdirycEzJVuw");
    expect(plan.remaining).toHaveLength(19);
    expect(plan.amountToken).toBe("250");
    expect(plan.amountQuote).toBe("9");
  });
});

function base(extra: { venue: "mock" | "raydium"; escrow: PublicKey; vesting: PublicKey }) {
  return {
    cranker,
    mint,
    usdcMint: usdc,
    ctokenMint: ctoken,
    saleUsdcVault: saleUsdc,
    saleTokenVault: saleToken,
    lpTokenVault: lpToken,
    treasuryUsdc,
    poolVaultA: vaultA,
    poolVaultB: vaultB,
    nativeVault,
    escrowVault: SystemProgram.programId,
    ...extra,
  };
}
