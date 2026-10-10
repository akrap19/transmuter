import { NATIVE_MINT } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { raydiumPoolKeys } from "@/lib/solana/raydium-cpmm";
import { mockNativePoolPda, mockPoolPda } from "./post-sale-accounts";
import { readPostSale, type PostSaleReaders } from "./read-post-sale";

const mint = Keypair.generate().publicKey;
const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const wallet = Keypair.generate().publicKey;
const NOW = 1_700_000_000;
const vaultA = Keypair.generate().publicKey;
const vaultB = Keypair.generate().publicKey;
const nativeVault = Keypair.generate().publicKey;

describe("readPostSale", () => {
  it("offers finalize after the window and counts treasury plus escrow USDC as backing", async () => {
    const view = await readPostSale(readers(), mint, wallet, NOW);

    expect(view?.offers).toEqual(["finalize"]);
    expect(view?.note).toBe("Any wallet can crank finalize. The creator is not required.");
    expect(view?.treasury.unconvertedUsdc).toBe(7);
    expect(view?.treasury.backingValueUsd).toBe(7);
    expect(view?.chain.venue).toBe("mock");
    expect(view?.chain.poolsReady).toBe(true);
    expect(view?.chain.poolVaultA.equals(vaultA)).toBe(true);
    expect(view?.chain.nativeVault.equals(nativeVault)).toBe(true);
    expect(view?.chain.cranker.equals(wallet)).toBe(true);
    expect(view?.treasury.reserveMint).toMatchObject({ pathBActivated: false, governedPct: 10 });
  });

  it("offers a claim and a treasury conversion once the sale is active", async () => {
    const view = await readPostSale(
      readers({
        status: 1,
        convertDone: false,
        depositAmount: BigInt(4_000_000),
        claimed: false,
        ctokenAtoms: BigInt(2_000_000_000),
        oraclePrice: BigInt(150_000_000),
        oracleExpo: -8,
      }),
      mint,
      wallet,
      NOW,
    );

    expect(view?.offers).toEqual(["convertTreasury", "claimTokens", "settleFees"]);
    expect(view?.treasury.cTokenAmount).toBe(2);
    expect(view?.treasury.cTokenPriceUsd).toBe(1.5);
    expect(view?.treasury.backingValueUsd).toBe(10);
    expect(view?.chain.depositAtoms).toBe(BigInt(4_000_000));
  });

  it("offers transfer-fee settlement on an active Raydium coin", async () => {
    const cpmm = raydiumPoolKeys(usdc, NATIVE_MINT).poolState;
    const view = await readPostSale(
      readers({ status: 1, convertDone: true, launchPool: cpmm }),
      mint,
      wallet,
      NOW,
    );

    expect(view?.chain.venue).toBe("raydium");
    expect(view?.offers).toContain("settleFees");
  });

  it("counts sale-vault USDC as backing and surfaces the holder count", async () => {
    const view = await readPostSale(
      readers({
        saleUsdcAtoms: BigInt(4_000_000),
        totalSupply: BigInt(100_000_000_000),
        salePrice: BigInt(1_000_000),
        holders: vi.fn().mockResolvedValue(1),
      }),
      mint,
      null,
      NOW,
    );

    expect(view?.treasury.unconvertedUsdc).toBe(11);
    expect(view?.backingRatioBps).toBe(1100);
    expect(view?.holderCount).toBe(1);
  });

  it("still returns the sale when the holder read fails", async () => {
    const view = await readPostSale(
      readers({ holders: vi.fn().mockRejectedValue(new Error("429")) }),
      mint,
      wallet,
      NOW,
    );

    expect(view?.holderCount).toBeNull();
    expect(view?.treasury.unconvertedUsdc).toBe(7);
  });

  it("returns null when the EOL config is not on chain", async () => {
    const empty = readers();
    empty.config.fetchNullable.mockResolvedValue(null);
    await expect(readPostSale(empty, mint, null, NOW)).resolves.toBeNull();
  });
});

function readers(overrides: {
  status?: number;
  convertDone?: boolean;
  depositAmount?: bigint;
  claimed?: boolean;
  ctokenAtoms?: bigint;
  oraclePrice?: bigint;
  oracleExpo?: number;
  saleUsdcAtoms?: bigint;
  totalSupply?: bigint;
  salePrice?: bigint;
  holders?: PostSaleReaders["holders"];
  launchPool?: PublicKey;
} = {}) {
  const config = {
    status: overrides.status ?? 0,
    saleEnd: BigInt(NOW),
    soldTokens: BigInt(0),
    saleTokens: BigInt(100),
    convertDone: overrides.convertDone ?? true,
    claimed: false,
    saleUsdcVault: Keypair.generate().publicKey,
    saleTokenVault: Keypair.generate().publicKey,
    lpTokenVault: Keypair.generate().publicKey,
    treasuryUsdc: Keypair.generate().publicKey,
    protocolRevenueWallet: Keypair.generate().publicKey,
    feeVault: Keypair.generate().publicKey,
    ctokenTreasury: Keypair.generate().publicKey,
    usdcMint: usdc,
    ctokenMint: Keypair.generate().publicKey,
    escrow: PublicKey.default,
    vesting: PublicKey.default,
    escrowUsdc: BigInt(2_000_000),
    solResidue: BigInt(0),
    oraclePrice: overrides.oraclePrice ?? BigInt(0),
    oracleExpo: overrides.oracleExpo ?? 0,
    totalSupply: overrides.totalSupply ?? BigInt(0),
    salePrice: overrides.salePrice ?? BigInt(1_000_000),
    decimals: 9,
    lpUsdcShareBps: 5_000,
    governedMintPctBps: 1_000,
    rmAllowanceOpen: false,
    rmGovOpen: false,
  };
  const pool = Buffer.alloc(8 + 32 * 4);
  vaultA.toBuffer().copy(pool, 8 + 64);
  vaultB.toBuffer().copy(pool, 8 + 96);
  const native = Buffer.alloc(8 + 64);
  nativeVault.toBuffer().copy(native, 8 + 32);
  const poolPda = mockPoolPda(mint, usdc);
  const nativePda = mockNativePoolPda(usdc);

  return {
    config: { fetchNullable: vi.fn().mockResolvedValue(config) },
    launch: {
      fetchNullable: vi.fn().mockResolvedValue(overrides.launchPool ? { poolUsdc: overrides.launchPool } : null),
    },
    mintIndex: {
      fetchNullable: vi.fn().mockResolvedValue(overrides.launchPool ? { launchId: 1n } : null),
    },
    deposit: { fetchNullable: vi.fn().mockResolvedValue(overrides.depositAmount == null ? null : { amount: overrides.depositAmount, claimed: overrides.claimed ?? false }) },
    escrow: { fetchNullable: vi.fn().mockResolvedValue(null) },
    accountData: vi.fn(async (address: PublicKey) => {
      if (address.equals(poolPda)) return pool;
      if (address.equals(nativePda)) return native;
      return null;
    }),
    tokenAmount: vi.fn(async (address: PublicKey) => {
      if (address.equals(config.treasuryUsdc)) return BigInt(5_000_000);
      if (address.equals(config.ctokenTreasury)) return overrides.ctokenAtoms ?? BigInt(0);
      if (address.equals(config.saleUsdcVault)) return overrides.saleUsdcAtoms ?? BigInt(0);
      return BigInt(0);
    }),
    lamports: vi.fn().mockResolvedValue(BigInt(0)),
    mintSupply: vi.fn().mockResolvedValue(BigInt(2_000_000_000_000)),
    holders: overrides.holders,
  };
}
