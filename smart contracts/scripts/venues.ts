/**
 * Public-devnet venues for the lifecycle keeper: Hermes → PriceUpdateV2
 * and a Raydium CPMM USDC/WSOL pool for convertTreasury.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export const RAYDIUM_CPMM = new PublicKey(
  "CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW",
);
export const RAYDIUM_AMM_CONFIG = new PublicKey(
  "9zSzfkYy6awexsHvmggeH36pfVUdDGyCcwmjT3AQPBj6",
);
export const RAYDIUM_CREATE_POOL_FEE = new PublicKey(
  "G11FKBRaAkHAKuLCgLM6K6NUc9rTjPAznRCjZifrTQe2",
);
export const PYTH_SOL_USD_FEED =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

const INIT_DISC = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
const AUTH_SEED = Buffer.from("vault_and_lp_mint_auth_seed");

export function cpmmAuthority(): PublicKey {
  return PublicKey.findProgramAddressSync([AUTH_SEED], RAYDIUM_CPMM)[0];
}

export function orderedMints(a: PublicKey, b: PublicKey): [PublicKey, PublicKey] {
  return Buffer.compare(a.toBuffer(), b.toBuffer()) < 0 ? [a, b] : [b, a];
}

export function cpmmPoolKeys(mintA: PublicKey, mintB: PublicKey) {
  const [token0, token1] = orderedMints(mintA, mintB);
  const [poolState] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      RAYDIUM_AMM_CONFIG.toBuffer(),
      token0.toBuffer(),
      token1.toBuffer(),
    ],
    RAYDIUM_CPMM,
  );
  const [lpMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_lp_mint"), poolState.toBuffer()],
    RAYDIUM_CPMM,
  );
  const [vault0] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0.toBuffer()],
    RAYDIUM_CPMM,
  );
  const [vault1] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1.toBuffer()],
    RAYDIUM_CPMM,
  );
  const [observation] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()],
    RAYDIUM_CPMM,
  );
  return {
    token0,
    token1,
    poolState,
    lpMint,
    vault0,
    vault1,
    observation,
    authority: cpmmAuthority(),
  };
}

export async function wrapSol(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  lamports: number,
  opts: anchor.web3.ConfirmOptions,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, payer.publicKey);
  const info = await connection.getAccountInfo(ata);
  const tx = new Transaction();
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        payer.publicKey,
        NATIVE_MINT,
      ),
    );
  }
  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: ata,
      lamports,
    }),
    createSyncNativeInstruction(ata),
  );
  await sendAndConfirmTransaction(connection, tx, [payer], opts);
  return ata;
}

export type CpmmPool = {
  poolState: PublicKey;
  usdcVault: PublicKey;
  wsolVault: PublicKey;
  observation: PublicKey;
  authority: PublicKey;
  ammConfig: PublicKey;
};

export async function createCpmmUsdcWsolPool(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  usdcMint: PublicKey,
  usdcAta: PublicKey,
  usdcAmount: bigint,
  wsolLamports: number,
  opts: anchor.web3.ConfirmOptions,
): Promise<CpmmPool> {
  const wsolAta = await wrapSol(connection, payer, wsolLamports, opts);
  const keys = cpmmPoolKeys(usdcMint, NATIVE_MINT);
  const creatorLp = getAssociatedTokenAddressSync(keys.lpMint, payer.publicKey);
  const amount0 =
    keys.token0.equals(usdcMint) ? usdcAmount : BigInt(wsolLamports);
  const amount1 =
    keys.token1.equals(usdcMint) ? usdcAmount : BigInt(wsolLamports);
  const data = Buffer.alloc(8 + 8 + 8 + 8);
  INIT_DISC.copy(data, 0);
  data.writeBigUInt64LE(amount0, 8);
  data.writeBigUInt64LE(amount1, 16);
  data.writeBigUInt64LE(0n, 24);
  const creator0 = keys.token0.equals(usdcMint) ? usdcAta : wsolAta;
  const creator1 = keys.token1.equals(usdcMint) ? usdcAta : wsolAta;
  const token0Program = TOKEN_PROGRAM_ID;
  const token1Program = TOKEN_PROGRAM_ID;
  const ix = new TransactionInstruction({
    programId: RAYDIUM_CPMM,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: RAYDIUM_AMM_CONFIG, isSigner: false, isWritable: false },
      { pubkey: keys.authority, isSigner: false, isWritable: false },
      { pubkey: keys.poolState, isSigner: false, isWritable: true },
      { pubkey: keys.token0, isSigner: false, isWritable: false },
      { pubkey: keys.token1, isSigner: false, isWritable: false },
      { pubkey: keys.lpMint, isSigner: false, isWritable: true },
      { pubkey: creator0, isSigner: false, isWritable: true },
      { pubkey: creator1, isSigner: false, isWritable: true },
      { pubkey: creatorLp, isSigner: false, isWritable: true },
      { pubkey: keys.vault0, isSigner: false, isWritable: true },
      { pubkey: keys.vault1, isSigner: false, isWritable: true },
      { pubkey: RAYDIUM_CREATE_POOL_FEE, isSigner: false, isWritable: true },
      { pubkey: keys.observation, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: token0Program, isSigner: false, isWritable: false },
      { pubkey: token1Program, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
      .add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      )
      .add(ix),
    [payer],
    opts,
  );
  return {
    poolState: keys.poolState,
    usdcVault: keys.token0.equals(usdcMint) ? keys.vault0 : keys.vault1,
    wsolVault: keys.token0.equals(NATIVE_MINT) ? keys.vault0 : keys.vault1,
    observation: keys.observation,
    authority: keys.authority,
    ammConfig: RAYDIUM_AMM_CONFIG,
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
}) {
  const keys = cpmmPoolKeys(args.mintA, args.mintB);
  const creator0 = keys.token0.equals(args.mintA) ? args.creatorAtaA : args.creatorAtaB;
  const creator1 = keys.token1.equals(args.mintA) ? args.creatorAtaA : args.creatorAtaB;
  const token0Program = keys.token0.equals(args.mintA)
    ? args.tokenProgramA
    : args.tokenProgramB;
  const token1Program = keys.token1.equals(args.mintA)
    ? args.tokenProgramA
    : args.tokenProgramB;
  const creatorLp = getAssociatedTokenAddressSync(keys.lpMint, args.creator, true);
  return {
    keys: [
      { pubkey: RAYDIUM_AMM_CONFIG, isSigner: false, isWritable: false },
      { pubkey: keys.authority, isSigner: false, isWritable: false },
      { pubkey: keys.poolState, isSigner: false, isWritable: true },
      { pubkey: keys.token0, isSigner: false, isWritable: false },
      { pubkey: keys.token1, isSigner: false, isWritable: false },
      { pubkey: keys.lpMint, isSigner: false, isWritable: true },
      { pubkey: creator0, isSigner: false, isWritable: true },
      { pubkey: creator1, isSigner: false, isWritable: true },
      { pubkey: creatorLp, isSigner: false, isWritable: true },
      { pubkey: keys.vault0, isSigner: false, isWritable: true },
      { pubkey: keys.vault1, isSigner: false, isWritable: true },
      { pubkey: RAYDIUM_CREATE_POOL_FEE, isSigner: false, isWritable: true },
      { pubkey: keys.observation, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: token0Program, isSigner: false, isWritable: false },
      { pubkey: token1Program, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    poolState: keys.poolState,
    lpMint: keys.lpMint,
  };
}

export type PythPost = {
  priceUpdate: PublicKey;
  live: boolean;
};

async function fetchHermesUpdate(): Promise<string[] | null> {
  const urls = [
    process.env.HERMES_URL,
    "https://hermes.pyth.network/v2/updates/price/latest",
    "https://pyth.dourolabs.app/hermes/v2/updates/price/latest",
  ].filter(Boolean) as string[];
  const headers: Record<string, string> = {};
  if (process.env.HERMES_API_KEY) {
    headers["x-api-key"] = process.env.HERMES_API_KEY;
  }
  for (const base of urls) {
    const url = `${base}${base.includes("?") ? "&" : "?"}ids[]=${PYTH_SOL_USD_FEED}&encoding=base64`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        binary?: { data?: string[] };
      };
      if (body.binary?.data?.length) return body.binary.data;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function postOrWritePyth(args: {
  connection: anchor.web3.Connection;
  payer: anchor.web3.Keypair;
  pyth: Program;
  opts: anchor.web3.ConfirmOptions;
}): Promise<PythPost> {
  const binary = await fetchHermesUpdate();
  if (binary) {
    try {
      // Optional client. Public Hermes currently 401s without HERMES_API_KEY.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await Function(
        'return import("@pythnetwork/pyth-solana-receiver")',
      )();
      const wallet = new anchor.Wallet(args.payer);
      const receiver = new mod.PythSolanaReceiver({
        connection: args.connection,
        wallet,
      });
      const builder = receiver.newTransactionBuilder({
        closeUpdateAccounts: false,
      });
      await builder.addPostPriceUpdates(binary);
      let posted: PublicKey | null = null;
      await builder.addPriceConsumerInstructions(async (getAccount: (id: string) => PublicKey) => {
        posted = getAccount(PYTH_SOL_USD_FEED);
        return [];
      });
      await receiver.provider.sendAll(
        await builder.buildVersionedTransactions({
          computeUnitPriceMicroLamports: 50_000,
        }),
        args.opts,
      );
      if (posted) return { priceUpdate: posted, live: true };
    } catch (err) {
      console.log(
        "hermes post skipped:",
        err instanceof Error ? err.message : err,
      );
    }
  }
  const [priceUpdate] = PublicKey.findProgramAddressSync(
    [Buffer.from("price_v2"), args.payer.publicKey.toBuffer()],
    args.pyth.programId,
  );
  const now = Math.floor(Date.now() / 1000);
  await args.pyth.methods
    .writeV2(
      new anchor.BN(15_000_000_000),
      new anchor.BN(50_000_000),
      -8,
      new anchor.BN(now),
    )
    .accounts({ payer: args.payer.publicKey, priceUpdate })
    .rpc(args.opts);
  return { priceUpdate, live: false };
}
