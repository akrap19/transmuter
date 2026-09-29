/**
 * Backing-only Factory launch on the configured cluster, stopped at SALE.
 *
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com yarn devnet-sale
 *
 * Emits TokenLaunched from wire_vaults so the indexer can hydrate GET /coins.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { FOUNDER } from "../tests/read-constants";
import { mintAuthorityPda } from "../tests/pda";

const DECIMALS = 9;
const SCALE = 1_000_000_000n;
const SUPPLY = 1_000_000n * SCALE;
const SALE_PRICE = 1_000_000;
const SALE_BPS = 9000;
const SALE_WINDOW_MIN = 24 * 3600;
const CSOL = new PublicKey("56Hn5H3KpAbCBefSCJXiWCyRxvWF2qGPKATxibFytcPD");
const CBTC = new PublicKey("FpTP5s3cWYaWMXjsFrtLjZBTPcjvQQHksBFKasVrdAFh");
const OFFICIAL_DEVNET_RPC = "https://api.devnet.solana.com";
const PUBLIC_DEVNET_RPC = "https://devnet.rpcpool.com";

function rateLimitedFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const run = async () => {
    let wait = 1_000;
    for (let i = 0; i < 6; i++) {
      const res = await fetch(input, init);
      if (res.status !== 429) return res;
      await res.arrayBuffer().catch(() => undefined);
      await sleep(wait);
      wait = Math.min(wait * 2, 4_000);
    }
    return fetch(input, init);
  };
  return run();
}

function quietConnection(url: string): Connection {
  return new Connection(url, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 120_000,
    fetch: rateLimitedFetch,
  } as never);
}

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function u64le(n: number | bigint) {
  return Buffer.from(new anchor.BN(n.toString()).toArray("le", 8));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function step(label: string) {
  console.log("step:", label);
}

async function main() {
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  process.env.ANCHOR_PROVIDER_URL =
    process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";
  process.env.ANCHOR_WALLET = process.env.ANCHOR_WALLET ?? walletPath;
  if (!fs.existsSync(process.env.ANCHOR_WALLET)) {
    throw new Error(`wallet missing at ${process.env.ANCHOR_WALLET}`);
  }

  const wallet = anchor.Wallet.local();
  // Official api.devnet.solana.com often simulates with "Blockhash not found".
  const preferred = process.env.SOLANA_RPC_URL ?? PUBLIC_DEVNET_RPC;
  let connection = quietConnection(preferred);
  try {
    await connection.getLatestBlockhash("confirmed");
  } catch {
    const fallback = preferred === OFFICIAL_DEVNET_RPC ? PUBLIC_DEVNET_RPC : OFFICIAL_DEVNET_RPC;
    connection = quietConnection(fallback);
    await connection.getLatestBlockhash("confirmed");
  }
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: false,
    maxRetries: 12,
  });
  anchor.setProvider(provider);

  const factory = anchor.workspace.TransmuterFactory as Program;
  const eol = anchor.workspace.TransmuterEolToken as Program;
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const staking = anchor.workspace.TransmuterStaking as Program;
  const dex = anchor.workspace.MockDex as Program;
  const dao = anchor.workspace.TransmuterDao as Program;
  const payer = (provider.wallet as anchor.Wallet).payer;
  connection = provider.connection;
  const txOpts = { commitment: "confirmed" as const, skipPreflight: false, maxRetries: 12 };
  const cu = [
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: FOUNDER.MAX_COMPUTE_UNITS }),
  ];

  const [factoryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("factory")],
    factory.programId,
  );
  const cfg = await (factory.account as any).factoryConfig.fetch(factoryPda);
  const id = Number(cfg.totalLaunches);
  const usdc = cfg.usdcMint as PublicKey;
  const protocol = cfg.protocolRevenueWallet as PublicKey;
  const csolConfig = pda([Buffer.from("config"), CSOL.toBuffer()], ctoken.programId);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const launch = pda([Buffer.from("launch"), u64le(id)], factory.programId);
  const mintIndex = pda([Buffer.from("mint"), mint.toBuffer()], factory.programId);
  const eolConfig = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
  const mintAuthority = mintAuthorityPda(eol.programId, mint)[0];
  const stakingConfig = pda([Buffer.from("config"), mint.toBuffer()], staking.programId);
  const poolUsdc = pda(
    [Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()],
    dex.programId,
  );
  const nativePool = pda([Buffer.from("native"), usdc.toBuffer()], dex.programId);
  const eolRecord = pda(
    [Buffer.from("eol"), csolConfig.toBuffer(), mint.toBuffer()],
    ctoken.programId,
  );
  const ctokenTreasury = getAssociatedTokenAddressSync(
    CSOL,
    eolConfig,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const now = Math.floor(Date.now() / 1000);
  const targetRaise = new anchor.BN(SALE_BPS).mul(new anchor.BN(100_000_000));

  console.log("rpc:", connection.rpcEndpoint);
  console.log("launch id:", id);
  console.log("mint:", mint.toBase58());
  console.log("launch:", launch.toBase58());

  async function send(label: string, fn: () => Promise<string>) {
    let last: unknown;
    for (let i = 0; i < 6; i++) {
      try {
        step(label);
        const sig = await fn();
        console.log("sig:", sig);
        await sleep(800);
        return;
      } catch (err) {
        last = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${label} failed:`, msg.slice(0, 400));
        if (!/429|blockhash|expired|block height|Too many|fetch/i.test(msg) || i === 5) {
          throw err;
        }
        await sleep(2_000 * (i + 1));
      }
    }
    throw last;
  }

  await send("createLaunch", () =>
    factory.methods
      .createLaunch(new anchor.BN(id), {
        name: "Devnet",
        symbol: "DNET",
        decimals: DECIMALS,
        saleType: 0,
        salePrice: new anchor.BN(SALE_PRICE),
        targetRaise,
        totalSupply: new anchor.BN(SUPPLY.toString()),
        saleBps: SALE_BPS,
        lpBps: 1000,
        lpSolShareBps: 5000,
        lpUsdcShareBps: 5000,
        teamBps: 0,
        investorBps: 0,
        daoBps: 0,
        escrowFundingNeed: new anchor.BN(0),
        saleEnd: new anchor.BN(now + SALE_WINDOW_MIN + 120),
        governedMintPctBps: 1000,
        reserveMintActivatePct: new anchor.BN(5),
        reserveMintDeactivatePct: new anchor.BN(20),
        reserveMintDurationSecs: new anchor.BN(6 * 3600),
        reserveMintVoteWindowSecs: new anchor.BN(SALE_WINDOW_MIN),
        liqVoteWindowSecs: new anchor.BN(14 * 24 * 3600),
        convertChunk: new anchor.BN(0),
        // Devnet Factory binary (Sep 23) still enforces the previous 0.50% split.
        transferFeeBps: 50,
        feeLpBps: 15,
        feeTreasuryBps: 15,
        feeCtokenBps: 5,
        feeProtocolBps: 15,
        feeCreatorBps: 0,
        feeBurnBps: 0,
        forfeitDest: 0,
        vestingSchedule: 0,
      })
      .accounts({
        creator: payer.publicKey,
        factory: factoryPda,
        mint,
        backingCtoken: CSOL,
        fallbackCtoken: CBTC,
        backingListing: pda([Buffer.from("ctoken"), CSOL.toBuffer()], factory.programId),
        fallbackListing: pda([Buffer.from("ctoken"), CBTC.toBuffer()], factory.programId),
        teamRecipient: payer.publicKey,
        daoContract: dao.programId,
        launch,
        mintIndex,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(cu)
      .rpc(txOpts),
  );

  await send("wireEol", () =>
    factory.methods
      .wireEol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
        mint,
        mintAuthority,
        eolConfig,
        usdcMint: usdc,
        ctokenMint: CSOL,
        protocolRevenueWallet: protocol,
        vestingConfig: SystemProgram.programId,
        stakingConfig,
        escrowConfig: SystemProgram.programId,
        ctokenTreasury,
        eolProgram: eol.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .preInstructions(cu)
      .rpc(txOpts),
  );

  const stakeVault = Keypair.generate();
  await send("wireStaking", () =>
    factory.methods
      .wireStaking()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
        mint,
        eolConfig,
        stakingConfig,
        vault: stakeVault.publicKey,
        stakingProgram: staking.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([stakeVault])
      .preInstructions(cu)
      .rpc(txOpts),
  );

  await send("ctoken treasury ata", () =>
    sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ...cu,
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ctokenTreasury,
          eolConfig,
          CSOL,
          TOKEN_2022_PROGRAM_ID,
        ),
      ),
      [payer],
      txOpts,
    ),
  );

  await send("wireRegister", () =>
    factory.methods
      .wireRegister()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
        eolConfig,
        ctokenProgram: ctoken.programId,
        ctokenConfig: csolConfig,
        ctokenTreasury,
        eolRecord,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(cu)
      .rpc(txOpts),
  );

  await send("wireDao", () =>
    factory.methods
      .wireDao()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
      })
      .preInstructions(cu)
      .rpc(txOpts),
  );

  const vaultA = Keypair.generate();
  const vaultB = Keypair.generate();
  await send("wirePoolUsdc", () =>
    factory.methods
      .wirePoolUsdc()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
        eolConfig,
        mint,
        usdcMint: usdc,
        pool: poolUsdc,
        vaultA: vaultA.publicKey,
        vaultB: vaultB.publicKey,
        dexProgram: dex.programId,
        tokenProgramA: TOKEN_2022_PROGRAM_ID,
        tokenProgramB: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([vaultA, vaultB])
      .preInstructions(cu)
      .rpc(txOpts),
  );

  const nativeVault = Keypair.generate();
  await send("wirePoolSol", () =>
    factory.methods
      .wirePoolSol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
        eolConfig,
        usdcMint: usdc,
        nativePool,
        vaultUsdc: nativeVault.publicKey,
        dexProgram: dex.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([nativeVault])
      .preInstructions(cu)
      .rpc(txOpts),
  );

  const saleUsdc = Keypair.generate();
  const saleToken = Keypair.generate();
  const lpToken = Keypair.generate();
  const teamToken = Keypair.generate();
  const treasuryUsdc = Keypair.generate();
  const feeVault = Keypair.generate();
  await send("wireVaults", () =>
    factory.methods
      .wireVaults()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch,
        eolConfig,
        mint,
        mintAuthority,
        usdcMint: usdc,
        saleUsdcVault: saleUsdc.publicKey,
        saleTokenVault: saleToken.publicKey,
        lpTokenVault: lpToken.publicKey,
        teamTokenVault: teamToken.publicKey,
        treasuryUsdc: treasuryUsdc.publicKey,
        feeVault: feeVault.publicKey,
        ctokenTreasury,
        eolProgram: eol.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        usdcProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([saleUsdc, saleToken, lpToken, teamToken, treasuryUsdc, feeVault])
      .preInstructions(cu)
      .rpc(txOpts),
  );

  const sale = await (factory.account as any).launch.fetch(launch);
  if (sale.status !== 2) {
    throw new Error(`expected SALE status 2, got ${sale.status}`);
  }
  console.log("SALE mint:", mint.toBase58());
  console.log("backing:", sale.backingCtoken.toBase58());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
