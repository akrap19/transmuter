/**
 * Keeper job: settle Token-2022 withheld transfer fees for EOL mints.
 *
 * Dry run by default. Set SETTLE_EXECUTE=1 to send transactions.
 *
 *   SETTLE_MINTS=<mint[,mint...]> yarn keeper                       # dry run
 *   SETTLE_MINTS=<mint> SETTLE_EXECUTE=1 yarn keeper                # send
 *
 * For each active mint it:
 *   1. Reads the EOL config and the Factory launch (creator, pool venue).
 *   2. Creates the backing fee sinks once, if missing (Factory `init_backing_fee_sinks`).
 *   3. Syncs the fee route, if missing (Factory `sync_fee_route`).
 *   4. Settles, passing Token-2022 accounts that hold withheld fees as harvest sources.
 *
 * The creator leg is paid to the creator's token account. It is never the cranker's.
 * The on-chain program does not check `creator_ata`, so this job must pass the right one.
 *
 * Settling uses a legacy transaction. A Raydium-venue settle has many fixed accounts, so
 * the job reports the serialized size and refuses to send anything over the packet limit.
 * Those launches need an address lookup table, which this job does not create yet.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type AccountMeta,
} from "@solana/web3.js";
import { RAYDIUM_AMM_CONFIG, RAYDIUM_CPMM, cpmmPoolKeys } from "./venues";

export const EOL_PROGRAM = new PublicKey("DUYcHygp6rTdf3XY49ewhEyzpUg2QEfWECPTu5ucpaXJ");
export const FACTORY_PROGRAM = new PublicKey("5D3y69mm4wrz7VcGsagfvnrMorvLar7ZnZaLfd3uVcfV");
export const CTOKEN_PROGRAM = new PublicKey("GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4");
export const MOCK_DEX = new PublicKey("B1Wxrd67VBAmBKKvwx41YZjgpJDfJWmJHyXfHCBfrqdV");

const PACKET_LIMIT = 1232;
/** Withheld-fee accounts harvested per settle. Keeps the legacy transaction under the packet limit. */
const MAX_SOURCES = 4;
const STATUS_ACTIVE = 1;
const TRANSFER_FEE_AMOUNT_EXT = 2;
const TOKEN_ACCOUNT_BASE_LEN = 165;
const COMPUTE_UNITS = 1_400_000;

const u64le = (n: bigint): Buffer => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
};
const derive = (program: PublicKey, ...seeds: Buffer[]): PublicKey =>
  PublicKey.findProgramAddressSync(seeds, program)[0];

export const eolConfigPda = (mint: PublicKey) => derive(EOL_PROGRAM, Buffer.from("config"), mint.toBuffer());
export const eolMintAuthorityPda = (mint: PublicKey) => derive(EOL_PROGRAM, Buffer.from("mint_authority"), mint.toBuffer());
export const feeRoutePda = (mint: PublicKey) => derive(EOL_PROGRAM, Buffer.from("fee_route"), mint.toBuffer());
export const factoryPda = () => derive(FACTORY_PROGRAM, Buffer.from("factory"));
export const mintIndexPda = (mint: PublicKey) => derive(FACTORY_PROGRAM, Buffer.from("mint"), mint.toBuffer());
export const launchPda = (id: bigint) => derive(FACTORY_PROGRAM, Buffer.from("launch"), u64le(id));
export const backingFeeSinkPda = (kind: "gold" | "spx") =>
  derive(FACTORY_PROGRAM, Buffer.from("backing_fee"), Buffer.from(kind));
export const ctokenReservePda = (mint: PublicKey) => derive(CTOKEN_PROGRAM, Buffer.from("reserve"), mint.toBuffer());
export const mockPoolPda = (mint: PublicKey, usdc: PublicKey) =>
  derive(MOCK_DEX, Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer());
export const mockNativePoolPda = (usdc: PublicKey) => derive(MOCK_DEX, Buffer.from("native"), usdc.toBuffer());

/**
 * Amount withheld on one Token-2022 token account (TransferFeeAmount extension).
 * Layout: 165-byte base, one account-type byte, then TLV entries of (u16 type, u16 len, value).
 */
export function withheldAmount(data: Uint8Array): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let i = TOKEN_ACCOUNT_BASE_LEN + 1;
  while (i + 4 <= data.length) {
    const type = view.getUint16(i, true);
    const len = view.getUint16(i + 2, true);
    if (type === TRANSFER_FEE_AMOUNT_EXT && len >= 8) return view.getBigUint64(i + 4, true);
    i += 4 + len;
  }
  return BigInt(0);
}

/** Token-2022 accounts for this mint that currently hold withheld fees, largest first. */
export async function withheldSources(connection: Connection, mint: PublicKey, exclude: PublicKey[]) {
  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    filters: [{ memcmp: { offset: 0, bytes: mint.toBase58() } }],
  });
  return accounts
    .filter(({ pubkey }) => !exclude.some((key) => key.equals(pubkey)))
    .map(({ pubkey, account }) => ({ address: pubkey, withheld: withheldAmount(account.data) }))
    .filter((entry) => entry.withheld > BigInt(0))
    .sort((a, b) => (a.withheld > b.withheld ? -1 : a.withheld < b.withheld ? 1 : 0));
}

function meta(pubkey: PublicKey, isWritable: boolean): AccountMeta {
  return { pubkey, isSigner: false, isWritable };
}

export type SettleReport = {
  mint: string;
  status: "skipped" | "dry-run" | "settled";
  reason?: string;
  venue?: "raydium" | "mock";
  feeVault?: bigint;
  sources?: number;
  withheld?: bigint;
  txBytes?: number;
  signatures?: string[];
};

type SettleContext = {
  connection: Connection;
  provider: anchor.AnchorProvider;
  eol: Program;
  factory: Program;
  execute: boolean;
};

export async function settleMint(ctx: SettleContext, mint: PublicKey): Promise<SettleReport> {
  const { connection, provider, eol, factory, execute } = ctx;
  const report: SettleReport = { mint: mint.toBase58(), status: "skipped" };
  const cranker = provider.wallet.publicKey;

  const config = await (eol.account as any).config.fetchNullable(eolConfigPda(mint));
  if (!config) return { ...report, reason: "no EOL config on this cluster" };
  if (Number(config.status) !== STATUS_ACTIVE) return { ...report, reason: `status ${Number(config.status)}, not active` };

  const index = await (factory.account as any).mintIndex.fetchNullable(mintIndexPda(mint));
  if (!index) return { ...report, reason: "not in the Factory index" };
  let launch: any;
  try {
    launch = await (factory.account as any).launch.fetch(launchPda(BigInt(index.launchId.toString())));
  } catch {
    // Launches created before the current Factory layout cannot be decoded. Recreate the launch.
    return { ...report, reason: "launch account is from an older Factory layout; recreate this launch" };
  }
  const creator: PublicKey | null = launch.creator ?? null;
  if (!creator) return { ...report, reason: "creator unknown; refusing to route the creator leg" };

  const usdc: PublicKey = config.usdcMint;
  const eolPool = cpmmPoolKeys(mint, usdc);
  const venue: "raydium" | "mock" = launch.poolUsdc.equals(eolPool.poolState) ? "raydium" : "mock";
  report.venue = venue;

  const feeVaultAmount = (await getAccount(connection, config.feeVault, undefined, TOKEN_2022_PROGRAM_ID)).amount;
  report.feeVault = feeVaultAmount;

  const creatorAta = getAssociatedTokenAddressSync(mint, creator, false, TOKEN_2022_PROGRAM_ID);
  const feeRoute = feeRoutePda(mint);
  const goldSink = backingFeeSinkPda("gold");
  const spxSink = backingFeeSinkPda("spx");
  const cbtcMint = launch.fallbackCtoken && !launch.fallbackCtoken.equals(SystemProgram.programId)
    ? launch.fallbackCtoken
    : config.ctokenMint;

  // Venue accounts.
  const configWsol = getAssociatedTokenAddressSync(NATIVE_MINT, eolConfigPda(mint), true, TOKEN_PROGRAM_ID);
  let pool: PublicKey, poolVaultA: PublicKey, poolVaultB: PublicKey, nativePool: PublicKey, nativeVault: PublicKey;
  let dexProgram: PublicKey;
  let fixedRemaining: AccountMeta[] = [];
  if (venue === "raydium") {
    const usdcVault = eolPool.token0.equals(usdc) ? eolPool.vault0 : eolPool.vault1;
    const wsolVault = eolPool.token0.equals(NATIVE_MINT) ? eolPool.vault0 : eolPool.vault1;
    const eolVault = eolPool.token0.equals(mint) ? eolPool.vault0 : eolPool.vault1;
    const quoteVault = eolPool.token0.equals(usdc) ? eolPool.vault0 : eolPool.vault1;
    dexProgram = RAYDIUM_CPMM;
    pool = eolPool.poolState;
    poolVaultA = eolVault;
    poolVaultB = quoteVault;
    nativePool = eolPool.poolState;
    nativeVault = usdcVault;
    fixedRemaining = [
      meta(eolPool.authority, false),
      meta(RAYDIUM_AMM_CONFIG, false),
      meta(eolPool.observation, true),
      meta(usdc, false),
      meta(NATIVE_MINT, false),
      meta(configWsol, true),
      meta(wsolVault, true),
      meta(TOKEN_PROGRAM_ID, false),
      meta(eolPool.observation, true),
    ];
  } else {
    dexProgram = MOCK_DEX;
    pool = mockPoolPda(mint, usdc);
    nativePool = mockNativePoolPda(usdc);
    const poolData = (await connection.getAccountInfo(pool))?.data;
    const nativeData = (await connection.getAccountInfo(nativePool))?.data;
    if (!poolData || !nativeData) return { ...report, reason: "mock DEX pool missing" };
    poolVaultA = new PublicKey(poolData.subarray(8 + 64, 8 + 96));
    poolVaultB = new PublicKey(poolData.subarray(8 + 96, 8 + 128));
    nativeVault = new PublicKey(nativeData.subarray(8 + 32, 8 + 64));
  }

  // Sinks and fee route are one-time setup. Check them before deciding anything.
  const needSinks = !(await connection.getAccountInfo(goldSink)) || !(await connection.getAccountInfo(spxSink));
  const needRoute = !(await connection.getAccountInfo(feeRoute));

  // Harvest sources. The fee vault itself is settled directly, so it is not a source.
  const all = await withheldSources(connection, mint, [config.feeVault]);
  const sources = all.slice(0, MAX_SOURCES);
  report.withheld = all.reduce((sum, entry) => sum + entry.withheld, BigInt(0));
  report.sources = sources.length;

  const launchAccount = launchPda(BigInt(index.launchId.toString()));
  const accounts = {
    cranker,
    config: eolConfigPda(mint),
    mint,
    mintAuthority: eolMintAuthorityPda(mint),
    feeVault: config.feeVault,
    lpTokenVault: config.lpTokenVault,
    treasuryUsdc: config.treasuryUsdc,
    scratchUsdc: config.saleUsdcVault,
    feeRoute,
    dexProgram,
    pool,
    poolVaultA,
    poolVaultB,
    poolMintA: mint,
    poolMintB: usdc,
    nativePool,
    nativeVault,
    ctokenProgram: CTOKEN_PROGRAM,
    ctokenMint: config.ctokenMint,
    cbtcMint,
    csolReserve: ctokenReservePda(config.ctokenMint),
    cbtcReserve: ctokenReservePda(cbtcMint),
    goldSink,
    spxSink,
    protocolRevenueWallet: config.protocolRevenueWallet,
    creatorAta,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    usdcProgram: TOKEN_PROGRAM_ID,
  };

  const settleIx = await (eol.methods as any)
    .settleTransferFees()
    .accounts(accounts)
    .remainingAccounts([
      ...fixedRemaining,
      ...sources.map((entry) => meta(entry.address, true)),
    ])
    .instruction();

  const settleTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS }),
    createAssociatedTokenAccountIdempotentInstruction(cranker, creatorAta, creator, mint, TOKEN_2022_PROGRAM_ID),
    ...(venue === "raydium"
      ? [createAssociatedTokenAccountIdempotentInstruction(cranker, configWsol, eolConfigPda(mint), NATIVE_MINT, TOKEN_PROGRAM_ID)]
      : []),
    settleIx,
  );
  settleTx.feePayer = cranker;
  settleTx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  report.txBytes = settleTx.serialize({ requireAllSignatures: false, verifySignatures: false }).length;

  // The size is reported even when there is nothing to settle, so a dry run can measure it.
  if (report.txBytes > PACKET_LIMIT) {
    return {
      ...report,
      reason: `settle transaction is ${report.txBytes} bytes, over the ${PACKET_LIMIT}-byte packet limit (needs an address lookup table)`,
    };
  }
  if (feeVaultAmount === BigInt(0) && sources.length === 0) {
    return { ...report, reason: "no withheld fees and an empty fee vault" };
  }

  if (!execute) return { ...report, status: "dry-run", reason: needSinks || needRoute ? "setup needed first" : undefined };

  const signatures: string[] = [];
  if (needSinks) {
    signatures.push(
      await (factory.methods as any)
        .initBackingFeeSinks()
        .accounts({ payer: cranker, goldSink, spxSink, systemProgram: SystemProgram.programId })
        .rpc(),
    );
  }
  if (needRoute) {
    signatures.push(
      await (factory.methods as any)
        .syncFeeRoute()
        .accounts({
          cranker,
          factory: factoryPda(),
          launch: launchAccount,
          eolConfig: eolConfigPda(mint),
          feeRoute,
          eolProgram: EOL_PROGRAM,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    );
  }
  signatures.push(await provider.sendAndConfirm(settleTx, [], { commitment: "confirmed" }));
  return { ...report, status: "settled", signatures };
}

/** Entry point used by keeper.ts. Reads SETTLE_MINTS and SETTLE_EXECUTE. */
export async function runSettleJob(provider: anchor.AnchorProvider, eol: Program, factory: Program): Promise<void> {
  const raw = process.env.SETTLE_MINTS?.trim();
  if (!raw) {
    console.log("settle: skip (set SETTLE_MINTS=<mint[,mint...]>; the keeper does not discover mints yet)");
    return;
  }
  const execute = process.env.SETTLE_EXECUTE === "1";
  console.log(`settle: ${execute ? "EXECUTE" : "dry run (set SETTLE_EXECUTE=1 to send)"}`);
  for (const value of raw.split(",").map((part) => part.trim()).filter(Boolean)) {
    try {
      const report = await settleMint({ connection: provider.connection, provider, eol, factory, execute }, new PublicKey(value));
      console.log(JSON.stringify(report, (_key, v) => (typeof v === "bigint" ? v.toString() : v)));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`settle: ${value} failed: ${message}`);
      if (process.env.SETTLE_DEBUG === "1" && err instanceof Error && err.stack) console.log(err.stack);
    }
  }
}

