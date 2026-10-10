import { getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { GOLD_FEE_ADDRESS, SPX_FEE_ADDRESS } from "@/lib/launchpad/backing-basket";
import { findPda } from "@/lib/solana/pda";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { ctokenConfigPda, ctokenMintAuthorityPda, ctokenReservePda, ctokenRevenuePda, CTOKEN_PROGRAM_ID } from "@/lib/solana/programs/ctoken";
import { eolConfigPda, eolLpSignerPda, eolMintAuthorityPda } from "@/lib/solana/programs/eol-token";
import { RUNWAY_ESCROW_PROGRAM_ID } from "@/lib/solana/programs/runway-escrow";
import { VESTING_PROGRAM_ID } from "@/lib/solana/programs/vesting";
import { RAYDIUM_CPMM_PROGRAM_ID, raydiumInitRemaining, raydiumPoolKeys, raydiumUsdcWsol } from "@/lib/solana/raydium-cpmm";

const MOCK_DEX = new PublicKey(PROGRAM_IDS.mockDex);
const U64_MAX = "18446744073709551615";

export type SaleVenue = "mock" | "raydium";

export type PostSaleAccountsInput = {
  cranker: PublicKey;
  mint: PublicKey;
  usdcMint: PublicKey;
  ctokenMint: PublicKey;
  saleUsdcVault: PublicKey;
  saleTokenVault: PublicKey;
  lpTokenVault: PublicKey;
  treasuryUsdc: PublicKey;
  protocolRevenueWallet: PublicKey;
  feeVault: PublicKey;
  fallbackCtoken: PublicKey;
  poolVaultA: PublicKey;
  poolVaultB: PublicKey;
  nativeVault: PublicKey;
  escrow: PublicKey;
  escrowVault: PublicKey;
  vesting: PublicKey;
  venue: SaleVenue;
};

export function mockPoolPda(mint: PublicKey, usdcMint: PublicKey): PublicKey {
  return findPda(MOCK_DEX, Buffer.from("pool"), mint.toBuffer(), usdcMint.toBuffer());
}

export function mockNativePoolPda(usdcMint: PublicKey): PublicKey {
  return findPda(MOCK_DEX, Buffer.from("native"), usdcMint.toBuffer());
}

export function readMockPoolVaults(data: Uint8Array): { vaultA: PublicKey; vaultB: PublicKey } | null {
  if (data.length < 8 + 128) return null;
  return {
    vaultA: new PublicKey(data.subarray(8 + 64, 8 + 96)),
    vaultB: new PublicKey(data.subarray(8 + 96, 8 + 128)),
  };
}

export function readNativePoolVault(data: Uint8Array): PublicKey | null {
  if (data.length < 8 + 64) return null;
  return new PublicKey(data.subarray(8 + 32, 8 + 64));
}

export function finalizePlan(input: PostSaleAccountsInput) {
  const programs = sidePrograms(input);
  const raydium = input.venue === "raydium" ? usdcWsol(input) : null;
  return {
    remaining: raydium?.remaining ?? [],
    accounts: {
      cranker: input.cranker,
      config: eolConfigPda(input.mint),
      mint: input.mint,
      mintAuthority: eolMintAuthorityPda(input.mint),
      saleUsdcVault: input.saleUsdcVault,
      saleTokenVault: input.saleTokenVault,
      lpTokenVault: input.lpTokenVault,
      treasuryUsdc: input.treasuryUsdc,
      usdcMint: input.usdcMint,
      dexProgram: raydium ? RAYDIUM_CPMM_PROGRAM_ID : MOCK_DEX,
      poolUsdc: raydium ? raydium.poolState : mockPoolPda(input.mint, input.usdcMint),
      poolUsdcVaultA: raydium ? raydium.usdcVault : input.poolVaultA,
      poolUsdcVaultB: raydium ? raydium.wsolVault : input.poolVaultB,
      nativePool: raydium ? raydium.poolState : mockNativePoolPda(input.usdcMint),
      nativeVault: raydium ? raydium.usdcVault : input.nativeVault,
      ...programs,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
    },
  };
}

export function convertPlan(input: PostSaleAccountsInput) {
  const ctokenConfig = ctokenConfigPda(input.ctokenMint);
  const raydium = input.venue === "raydium" ? usdcWsol(input) : null;
  return {
    maxIn: U64_MAX,
    minOut: "1",
    remaining: raydium?.remaining ?? [],
    accounts: {
      cranker: input.cranker,
      config: eolConfigPda(input.mint),
      treasuryUsdc: input.treasuryUsdc,
      protocolRevenueWallet: input.protocolRevenueWallet,
      dexProgram: raydium ? RAYDIUM_CPMM_PROGRAM_ID : MOCK_DEX,
      nativePool: raydium ? raydium.poolState : mockNativePoolPda(input.usdcMint),
      nativeVault: raydium ? raydium.usdcVault : input.nativeVault,
      ctokenProgram: CTOKEN_PROGRAM_ID,
      ctokenConfig,
      ctokenReserve: ctokenReservePda(input.ctokenMint),
      ctokenRevenue: ctokenRevenuePda(input.ctokenMint),
      ctokenMint: input.ctokenMint,
      ctokenMintAuthority: ctokenMintAuthorityPda(input.ctokenMint),
      ctokenTreasury: getAssociatedTokenAddressSync(input.ctokenMint, eolConfigPda(input.mint), true, TOKEN_2022_PROGRAM_ID),
      eolRecord: findPda(CTOKEN_PROGRAM_ID, Buffer.from("eol"), ctokenConfig.toBuffer(), input.mint.toBuffer()),
      token2022Ctoken: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
  };
}

export function feeRoutePda(mint: PublicKey): PublicKey {
  return findPda(new PublicKey(PROGRAM_IDS.eolToken), Buffer.from("fee_route"), mint.toBuffer());
}

/** Harvest withheld Token-2022 fees and pay LP, treasury, the basket, and the protocol wallet. */
export function settlePlan(input: PostSaleAccountsInput) {
  const cbtcMint = input.fallbackCtoken.equals(SystemProgram.programId) ? input.ctokenMint : input.fallbackCtoken;
  const holderAta = getAssociatedTokenAddressSync(input.mint, input.cranker, false, TOKEN_2022_PROGRAM_ID);
  const raydium = input.venue === "raydium" ? usdcWsol(input) : null;
  const eolPool = raydium ? raydiumPoolKeys(input.mint, input.usdcMint) : null;
  const eolVault = eolPool ? (eolPool.token0.equals(input.mint) ? eolPool.vault0 : eolPool.vault1) : input.poolVaultA;
  const quoteVault = eolPool ? (eolPool.token0.equals(input.usdcMint) ? eolPool.vault0 : eolPool.vault1) : input.poolVaultB;
  return {
    holderAta,
    remaining: eolPool
      ? [...raydium!.remaining, { pubkey: eolPool.observation, isSigner: false, isWritable: true }]
      : [],
    accounts: {
      cranker: input.cranker,
      config: eolConfigPda(input.mint),
      mint: input.mint,
      mintAuthority: eolMintAuthorityPda(input.mint),
      feeVault: input.feeVault,
      lpTokenVault: input.lpTokenVault,
      treasuryUsdc: input.treasuryUsdc,
      scratchUsdc: input.saleUsdcVault,
      feeRoute: feeRoutePda(input.mint),
      dexProgram: raydium ? RAYDIUM_CPMM_PROGRAM_ID : MOCK_DEX,
      pool: eolPool ? eolPool.poolState : mockPoolPda(input.mint, input.usdcMint),
      poolVaultA: eolVault,
      poolVaultB: quoteVault,
      poolMintA: input.mint,
      poolMintB: input.usdcMint,
      nativePool: raydium ? raydium.poolState : mockNativePoolPda(input.usdcMint),
      nativeVault: raydium ? raydium.usdcVault : input.nativeVault,
      ctokenProgram: CTOKEN_PROGRAM_ID,
      ctokenMint: input.ctokenMint,
      cbtcMint,
      csolReserve: ctokenReservePda(input.ctokenMint),
      cbtcReserve: ctokenReservePda(cbtcMint),
      goldSink: new PublicKey(GOLD_FEE_ADDRESS),
      spxSink: new PublicKey(SPX_FEE_ADDRESS),
      protocolRevenueWallet: input.protocolRevenueWallet,
      creatorAta: holderAta,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
    },
  };
}

export function claimPlan(input: { mint: PublicKey; depositor: PublicKey; saleTokenVault: PublicKey }) {
  const destination = getAssociatedTokenAddressSync(input.mint, input.depositor, false, TOKEN_2022_PROGRAM_ID);
  return {
    destination,
    accounts: {
      depositor: input.depositor,
      config: eolConfigPda(input.mint),
      saleTokenVault: input.saleTokenVault,
      destination,
      mint: input.mint,
      deposit: findPda(new PublicKey(PROGRAM_IDS.eolToken), Buffer.from("deposit"), eolConfigPda(input.mint).toBuffer(), input.depositor.toBuffer()),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  };
}

export function seedRaydiumPlan(input: {
  cranker: PublicKey;
  mint: PublicKey;
  quoteMint: PublicKey;
  quoteVault: PublicKey;
  tokenVault: PublicKey;
  amountToken: bigint;
  amountQuote: bigint;
}) {
  const lpSigner = eolLpSignerPda(input.mint);
  return {
    amountToken: input.amountToken.toString(),
    amountQuote: input.amountQuote.toString(),
    lpSigner,
    remaining: raydiumInitRemaining({
      mintA: input.mint,
      mintB: input.quoteMint,
      creator: lpSigner,
      creatorAtaA: input.tokenVault,
      creatorAtaB: input.quoteVault,
      tokenProgramA: TOKEN_2022_PROGRAM_ID,
      tokenProgramB: TOKEN_PROGRAM_ID,
    }),
    accounts: {
      cranker: input.cranker,
      config: eolConfigPda(input.mint),
      mint: input.mint,
      tokenVault: input.tokenVault,
      quoteVault: input.quoteVault,
      lpSigner,
      dexProgram: RAYDIUM_CPMM_PROGRAM_ID,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      quoteProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
  };
}

function usdcWsol(input: PostSaleAccountsInput) {
  const configWsol = getAssociatedTokenAddressSync(NATIVE_MINT, eolConfigPda(input.mint), true, TOKEN_PROGRAM_ID);
  return raydiumUsdcWsol(input.usdcMint, configWsol);
}

function sidePrograms(input: PostSaleAccountsInput) {
  const escrowSet = !input.escrow.equals(SystemProgram.programId);
  const vestingSet = !input.vesting.equals(SystemProgram.programId);
  // escrow_config / escrow_vault / vesting_config are `#[account(mut)]`, so Anchor
  // requires them writable even when the matching CPI branch is skipped. The System
  // Program is executable and cannot be writable, so use the config PDA (already
  // writable, unconstrained in those unchecked slots) as the mut-safe sentinel.
  const mutSentinel = eolConfigPda(input.mint);
  return {
    escrowProgram: escrowSet ? RUNWAY_ESCROW_PROGRAM_ID : SystemProgram.programId,
    escrowConfig: escrowSet ? input.escrow : mutSentinel,
    escrowVault: escrowSet ? input.escrowVault : mutSentinel,
    vestingProgram: vestingSet ? VESTING_PROGRAM_ID : SystemProgram.programId,
    vestingConfig: vestingSet ? input.vesting : mutSentinel,
  };
}
