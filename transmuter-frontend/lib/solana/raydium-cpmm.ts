import { ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";

/** Raydium CPMM on public devnet. Same pins as `transmuter-constants`. */
export const RAYDIUM_CPMM_PROGRAM_ID = new PublicKey("CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW");
export const RAYDIUM_AMM_CONFIG = new PublicKey("9zSzfkYy6awexsHvmggeH36pfVUdDGyCcwmjT3AQPBj6");
export const RAYDIUM_CREATE_POOL_FEE = new PublicKey("G11FKBRaAkHAKuLCgLM6K6NUc9rTjPAznRCjZifrTQe2");

const AUTH_SEED = Buffer.from("vault_and_lp_mint_auth_seed");

export type AccountMeta = { pubkey: PublicKey; isSigner: boolean; isWritable: boolean };

export function raydiumCpmmAuthority(): PublicKey {
  return PublicKey.findProgramAddressSync([AUTH_SEED], RAYDIUM_CPMM_PROGRAM_ID)[0];
}

export function orderedMints(a: PublicKey, b: PublicKey): [PublicKey, PublicKey] {
  return Buffer.compare(a.toBuffer(), b.toBuffer()) < 0 ? [a, b] : [b, a];
}

export function raydiumPoolKeys(mintA: PublicKey, mintB: PublicKey) {
  const [token0, token1] = orderedMints(mintA, mintB);
  const poolState = pda(Buffer.from("pool"), RAYDIUM_AMM_CONFIG.toBuffer(), token0.toBuffer(), token1.toBuffer());
  const lpMint = pda(Buffer.from("pool_lp_mint"), poolState.toBuffer());
  const vault0 = pda(Buffer.from("pool_vault"), poolState.toBuffer(), token0.toBuffer());
  const vault1 = pda(Buffer.from("pool_vault"), poolState.toBuffer(), token1.toBuffer());
  const observation = pda(Buffer.from("observation"), poolState.toBuffer());
  return { token0, token1, poolState, lpMint, vault0, vault1, observation, authority: raydiumCpmmAuthority() };
}

/** USDC/WSOL pool plus the 8 remaining accounts `finalize` / `convert_treasury` swap through. */
export function raydiumUsdcWsol(usdcMint: PublicKey, configWsol: PublicKey) {
  const keys = raydiumPoolKeys(usdcMint, NATIVE_MINT);
  const usdcVault = keys.token0.equals(usdcMint) ? keys.vault0 : keys.vault1;
  const wsolVault = keys.token0.equals(NATIVE_MINT) ? keys.vault0 : keys.vault1;
  return {
    poolState: keys.poolState,
    usdcVault,
    wsolVault,
    remaining: [
      meta(keys.authority, false),
      meta(RAYDIUM_AMM_CONFIG, false),
      meta(keys.observation, true),
      meta(usdcMint, false),
      meta(NATIVE_MINT, false),
      meta(configWsol, true),
      meta(wsolVault, true),
      meta(TOKEN_PROGRAM_ID, false),
    ],
  };
}

/** 19 accounts after creator for Raydium CPMM `initialize`. */
export function raydiumInitRemaining(args: {
  mintA: PublicKey;
  mintB: PublicKey;
  creator: PublicKey;
  creatorAtaA: PublicKey;
  creatorAtaB: PublicKey;
  tokenProgramA: PublicKey;
  tokenProgramB: PublicKey;
}): AccountMeta[] {
  const keys = raydiumPoolKeys(args.mintA, args.mintB);
  const creator0 = keys.token0.equals(args.mintA) ? args.creatorAtaA : args.creatorAtaB;
  const creator1 = keys.token1.equals(args.mintA) ? args.creatorAtaA : args.creatorAtaB;
  const token0Program = keys.token0.equals(args.mintA) ? args.tokenProgramA : args.tokenProgramB;
  const token1Program = keys.token1.equals(args.mintA) ? args.tokenProgramA : args.tokenProgramB;
  const creatorLp = getAssociatedTokenAddressSync(keys.lpMint, args.creator, true);
  return [
    meta(RAYDIUM_AMM_CONFIG, false),
    meta(keys.authority, false),
    meta(keys.poolState, true),
    meta(keys.token0, false),
    meta(keys.token1, false),
    meta(keys.lpMint, true),
    meta(creator0, true),
    meta(creator1, true),
    meta(creatorLp, true),
    meta(keys.vault0, true),
    meta(keys.vault1, true),
    meta(RAYDIUM_CREATE_POOL_FEE, true),
    meta(keys.observation, true),
    meta(TOKEN_PROGRAM_ID, false),
    meta(token0Program, false),
    meta(token1Program, false),
    meta(ASSOCIATED_TOKEN_PROGRAM_ID, false),
    meta(SystemProgram.programId, false),
    meta(SYSVAR_RENT_PUBKEY, false),
  ];
}

function pda(...seeds: Array<Buffer | Uint8Array>): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, RAYDIUM_CPMM_PROGRAM_ID)[0];
}

function meta(pubkey: PublicKey, isWritable: boolean): AccountMeta {
  return { pubkey, isSigner: false, isWritable };
}
