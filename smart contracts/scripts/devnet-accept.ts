/**
 * Devnet acceptance for checklist section 9.
 *
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com yarn ts-node --transpile-only scripts/devnet-accept.ts
 *   RESUME_MINT=<mint> yarn ts-node --transpile-only scripts/devnet-accept.ts
 *
 * Creates a backing-only Factory launch, sells it out, finalizes, claims,
 * stakes, and casts a liquidation vote. Stops after SALE when the wallet
 * does not yet hold enough devnet USDC.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { FOUNDER } from "../tests/read-constants";
import { mintAuthorityPda } from "../tests/pda";

const DECIMALS = 9;
const SCALE = 1_000_000_000n;
const BPS = 10_000n;
const SUPPLY = 10_000n * SCALE;
const SALE_BPS = 9000;
const LP_BPS = 1000;
const SALE_WINDOW = 24 * 3600;
const POOL_USDC = 1_000_000n;
const POOL_SOL = Math.floor(0.5 * LAMPORTS_PER_SOL);
const CSOL = new PublicKey("56Hn5H3KpAbCBefSCJXiWCyRxvWF2qGPKATxibFytcPD");
const CBTC = new PublicKey("FpTP5s3cWYaWMXjsFrtLjZBTPcjvQQHksBFKasVrdAFh");
const OFFICIAL_DEVNET_RPC = "https://api.devnet.solana.com";
const PUBLIC_DEVNET_RPC = "https://devnet.rpcpool.com";
const MINT_FILE = path.join(os.tmpdir(), "transmuter-e2e-mint.txt");

class NeedUsdc extends Error {}

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

function usdcFor(tokens: bigint, price: bigint): bigint {
  return (tokens * price) / SCALE;
}

function gatesPass(premium: bigint, slip: bigint, price: bigint): { ok: boolean; raised: bigint } {
  const saleTokens = (SUPPLY * BigInt(SALE_BPS)) / BPS;
  const lpTokens = (SUPPLY * BigInt(LP_BPS)) / BPS;
  const raised = usdcFor(saleTokens, price);
  const s = BPS + slip;
  const g = (s * (BPS + premium)) / BPS;
  const l = 5_000n + (5_000n * s) / BPS;
  const mcp = usdcFor(SUPPLY, price);
  const lpCash = usdcFor(lpTokens, price);
  const lpCost = (lpCash * l) / BPS;
  const remainder = raised > lpCost ? raised - lpCost : 0n;
  const treasuryNeed = (mcp * 8n * g) / 100n / BPS;
  const combinedNeed = (mcp * 18n) / 100n;
  const combined = remainder + lpCash;
  const ok = raised >= lpCost && remainder >= treasuryNeed && combined >= combinedNeed && raised > 0n;
  return { ok, raised };
}

function salePrice(premium: bigint, slip: bigint): bigint {
  for (let price = 1n; price < 5_000_000n; price++) {
    const gate = gatesPass(premium, slip, price);
    if (gate.ok && gate.raised >= 8_000_000n && gate.raised <= 12_000_000n) return price;
  }
  throw new Error("no sale price fits an 8-12 USDC sellout");
}

async function main() {
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  process.env.ANCHOR_PROVIDER_URL = process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";
  process.env.ANCHOR_WALLET = process.env.ANCHOR_WALLET ?? walletPath;
  if (!fs.existsSync(process.env.ANCHOR_WALLET)) {
    throw new Error(`wallet missing at ${process.env.ANCHOR_WALLET}`);
  }

  const wallet = anchor.Wallet.local();
  const preferred = process.env.SOLANA_RPC_URL ?? PUBLIC_DEVNET_RPC;
  let connection = quietConnection(preferred);
  try {
    await connection.getLatestBlockhash("confirmed");
  } catch {
    connection = quietConnection(preferred === OFFICIAL_DEVNET_RPC ? PUBLIC_DEVNET_RPC : OFFICIAL_DEVNET_RPC);
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

  const factoryPda = pda([Buffer.from("factory")], factory.programId);
  const cfg = await (factory.account as any).factoryConfig.fetch(factoryPda);
  const usdc = cfg.usdcMint as PublicKey;
  const premium = BigInt(cfg.mintPremiumBps.toString());
  const slip = BigInt(cfg.sh2MaxSlippageBps.toString());
  const price = salePrice(premium, slip);
  const saleTokens = (SUPPLY * BigInt(SALE_BPS)) / BPS;
  const saleUsdcAmt = usdcFor(saleTokens, price);
  console.log("rpc:", connection.rpcEndpoint);
  console.log("premium", premium.toString(), "slip", slip.toString(), "price", price.toString());
  console.log("sellout usdc atoms", saleUsdcAmt.toString());

  const mint = process.env.RESUME_MINT
    ? new PublicKey(process.env.RESUME_MINT)
    : await createAndWire();

  try {
    await finish(mint);
  } catch (err) {
    if (err instanceof NeedUsdc) {
      fs.writeFileSync(MINT_FILE, mint.toBase58());
      console.log("NEED_USDC", mint.toBase58(), saleUsdcAmt.toString());
      process.exitCode = 2;
      return;
    }
    throw err;
  }

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
        console.log(`${label} failed:`, msg.slice(0, 500));
        if (!/429|blockhash|expired|block height|Too many|fetch/i.test(msg) || i === 5) throw err;
        await sleep(2_000 * (i + 1));
      }
    }
    throw last;
  }

  async function createAndWire(): Promise<PublicKey> {
    const fresh = await (factory.account as any).factoryConfig.fetch(factoryPda);
    const id = Number(fresh.totalLaunches);
    const protocol = fresh.protocolRevenueWallet as PublicKey;
    const csolConfig = pda([Buffer.from("config"), CSOL.toBuffer()], ctoken.programId);
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const launch = pda([Buffer.from("launch"), u64le(id)], factory.programId);
    const mintIndex = pda([Buffer.from("mint"), mint.toBuffer()], factory.programId);
    const eolConfig = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
    const mintAuthority = mintAuthorityPda(eol.programId, mint)[0];
    const stakingConfig = pda([Buffer.from("config"), mint.toBuffer()], staking.programId);
    const poolUsdc = pda([Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()], dex.programId);
    const nativePool = pda([Buffer.from("native"), usdc.toBuffer()], dex.programId);
    const eolRecord = pda([Buffer.from("eol"), csolConfig.toBuffer(), mint.toBuffer()], ctoken.programId);
    const ctokenTreasury = getAssociatedTokenAddressSync(CSOL, eolConfig, true, TOKEN_2022_PROGRAM_ID);
    const now = Math.floor(Date.now() / 1000);
    const targetRaise = new anchor.BN(saleUsdcAmt.toString());

    console.log("launch id:", id);
    console.log("mint:", mint.toBase58());
    console.log("launch:", launch.toBase58());

    await send("createLaunch", () =>
      factory.methods
        .createLaunch(new anchor.BN(id), {
          name: "E2E Accept",
          symbol: "E2E",
          decimals: DECIMALS,
          saleType: 0,
          salePrice: new anchor.BN(price.toString()),
          targetRaise,
          totalSupply: new anchor.BN(SUPPLY.toString()),
          saleBps: SALE_BPS,
          lpBps: LP_BPS,
          lpSolShareBps: 5000,
          lpUsdcShareBps: 5000,
          teamBps: 0,
          investorBps: 0,
          daoBps: 0,
          escrowFundingNeed: new anchor.BN(0),
          saleEnd: new anchor.BN(now + SALE_WINDOW + 180),
          governedMintPctBps: 1000,
          reserveMintActivatePct: new anchor.BN(5),
          reserveMintDeactivatePct: new anchor.BN(20),
          reserveMintDurationSecs: new anchor.BN(6 * 3600),
          reserveMintVoteWindowSecs: new anchor.BN(SALE_WINDOW),
          liqVoteWindowSecs: new anchor.BN(14 * 24 * 3600),
          convertChunk: new anchor.BN(0),
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
    if (sale.status !== 2) throw new Error(`expected SALE status 2, got ${sale.status}`);
    console.log("SALE mint:", mint.toBase58());
    fs.writeFileSync(MINT_FILE, mint.toBase58());
    return mint;
  }

  async function finish(mint: PublicKey) {
    const eolConfig = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
    const eolCfg = await (eol.account as any).config.fetch(eolConfig);
    const due = usdcFor(BigInt(eolCfg.saleTokens.toString()), BigInt(eolCfg.salePrice.toString()));
    const raised = BigInt(eolCfg.raisedUsdc.toString());
    const userUsdc = getAssociatedTokenAddressSync(usdc, payer.publicKey);
    const userAta = await connection.getAccountInfo(userUsdc);
    const balance = userAta ? BigInt((await getAccount(connection, userUsdc)).amount.toString()) : 0n;
    const nativePool = pda([Buffer.from("native"), usdc.toBuffer()], dex.programId);
    const nativeInfo = await connection.getAccountInfo(nativePool);
    if (!nativeInfo) throw new Error("native pool missing");
    const nativeVault = new PublicKey(nativeInfo.data.subarray(8 + 32, 8 + 64));
    const vaultBal = BigInt((await getAccount(connection, nativeVault)).amount.toString());
    const poolTopUp = vaultBal === 0n ? POOL_USDC : 0n;
    const remaining = due > raised ? due - raised : 0n;
    const need = remaining + poolTopUp;
    console.log("wallet usdc", balance.toString(), "need", need.toString(), "raised", raised.toString(), "mint", mint.toBase58());
    if (balance < need) throw new NeedUsdc(`have ${balance} need ${need}`);

    const depositPda = pda([Buffer.from("deposit"), eolConfig.toBuffer(), payer.publicKey.toBuffer()], eol.programId);
    if (remaining === 0n) {
      console.log("sale already filled");
    } else await send("sale deposit", async () => {
      const ix = await eol.methods
        .deposit(new anchor.BN(remaining.toString()))
        .accounts({
          depositor: payer.publicKey,
          config: eolConfig,
          saleUsdcVault: eolCfg.saleUsdcVault,
          source: userUsdc,
          deposit: depositPda,
          usdcProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      return sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          ...cu,
          createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, userUsdc, payer.publicKey, usdc),
          ix,
        ),
        [payer],
        txOpts,
      );
    });

    if (process.env.STOP_AFTER === "deposit") {
      console.log("DEPOSITED", mint.toBase58());
      return;
    }

    if (nativeInfo.lamports < POOL_SOL) {
      await send("fund native sol", () =>
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: payer.publicKey,
              toPubkey: nativePool,
              lamports: POOL_SOL,
            }),
          ),
          [payer],
          txOpts,
        ),
      );
    }
    if (poolTopUp > 0n) {
      await send("fund native usdc", () =>
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(
            createTransferInstruction(
              userUsdc,
              nativeVault,
              payer.publicKey,
              Number(POOL_USDC),
            ),
          ),
          [payer],
          txOpts,
        ),
      );
    }

    await finalizeClaimStake(mint, eolConfig, eolCfg, depositPda, nativePool, nativeVault);
  }

  async function finalizeClaimStake(
    mint: PublicKey,
    eolConfig: PublicKey,
    eolCfg: {
      saleUsdcVault: PublicKey;
      saleTokenVault: PublicKey;
      lpTokenVault: PublicKey;
      treasuryUsdc: PublicKey;
      staking: PublicKey;
    },
    depositPda: PublicKey,
    nativePool: PublicKey,
    nativeVault: PublicKey,
  ) {
    const poolUsdc = pda([Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()], dex.programId);
    const poolInfo = await connection.getAccountInfo(poolUsdc);
    if (!poolInfo) throw new Error("usdc pool missing");
    const vaultA = new PublicKey(poolInfo.data.subarray(8 + 64, 8 + 96));
    const vaultB = new PublicKey(poolInfo.data.subarray(8 + 96, 8 + 128));
    const mintAuthority = mintAuthorityPda(eol.programId, mint)[0];

    await send("finalize", () =>
      eol.methods
        .finalize()
        .accounts({
          cranker: payer.publicKey,
          config: eolConfig,
          mint,
          mintAuthority,
          saleUsdcVault: eolCfg.saleUsdcVault,
          saleTokenVault: eolCfg.saleTokenVault,
          lpTokenVault: eolCfg.lpTokenVault,
          treasuryUsdc: eolCfg.treasuryUsdc,
          usdcMint: usdc,
          dexProgram: dex.programId,
          poolUsdc,
          poolUsdcVaultA: vaultA,
          poolUsdcVaultB: vaultB,
          nativePool,
          nativeVault,
          escrowProgram: SystemProgram.programId,
          escrowConfig: SystemProgram.programId,
          escrowVault: SystemProgram.programId,
          vestingProgram: SystemProgram.programId,
          vestingConfig: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          usdcProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(cu)
        .rpc(txOpts),
    );

    const after = await (eol.account as any).config.fetch(eolConfig);
    console.log("eol status", after.status, "raised", after.raisedUsdc.toString());
    if (after.status !== 1) throw new Error(`expected ACTIVE status 1, got ${after.status}`);

    const mintIndex = pda([Buffer.from("mint"), mint.toBuffer()], factory.programId);
    const index = await (factory.account as any).mintIndex.fetch(mintIndex);
    const launch = pda([Buffer.from("launch"), u64le(BigInt(index.launchId.toString()))], factory.programId);
    await send("syncOutcome", () =>
      factory.methods
        .syncOutcome()
        .accounts({ cranker: payer.publicKey, launch, eolConfig })
        .rpc(txOpts),
    );
    const launchAcc = await (factory.account as any).launch.fetch(launch);
    console.log("factory status", launchAcc.status);

    const destination = getAssociatedTokenAddressSync(mint, payer.publicKey, false, TOKEN_2022_PROGRAM_ID);
    await send("claim", async () => {
      const ix = await eol.methods
        .claimTokens()
        .accounts({
          depositor: payer.publicKey,
          config: eolConfig,
          saleTokenVault: eolCfg.saleTokenVault,
          destination,
          mint,
          deposit: depositPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();
      return sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            destination,
            payer.publicKey,
            mint,
            TOKEN_2022_PROGRAM_ID,
          ),
          ix,
        ),
        [payer],
        txOpts,
      );
    });
    const claimed = await getAccount(connection, destination, undefined, TOKEN_2022_PROGRAM_ID);
    console.log("claimed atoms", claimed.amount.toString());
    if (claimed.amount <= 0n) throw new Error("claim left a zero balance");

    const stakeCfg = await (staking.account as any).stakeConfig.fetch(eolCfg.staking);
    await send("stake", () =>
      staking.methods
        .stake(new anchor.BN(claimed.amount.toString()))
        .accounts({
          owner: payer.publicKey,
          config: eolCfg.staking,
          mint,
          vault: stakeCfg.vault,
          source: destination,
          stakeAccount: pda(
            [Buffer.from("stake"), eolCfg.staking.toBuffer(), payer.publicKey.toBuffer()],
            staking.programId,
          ),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(txOpts),
    );
    const stakeAccount = pda(
      [Buffer.from("stake"), eolCfg.staking.toBuffer(), payer.publicKey.toBuffer()],
      staking.programId,
    );
    const staked = await (staking.account as any).stakeAccount.fetch(stakeAccount);
    const weight = BigInt(staked.amount.toString());
    console.log("staked atoms", weight.toString());
    if (weight <= 0n) throw new Error("stake left a zero balance");

    await send("open trouble", () =>
      eol.methods
        .openTroubleGate()
        .accounts({ cranker: payer.publicKey, config: eolConfig, mint })
        .rpc(txOpts),
    );
    await send("open vote", () =>
      eol.methods
        .openLiquidationVote()
        .accounts({ cranker: payer.publicKey, config: eolConfig, mint })
        .rpc(txOpts),
    );
    await send("cast vote", () =>
      eol.methods
        .castLiquidationVote(true, new anchor.BN(weight.toString()))
        .accounts({
          voter: payer.publicKey,
          config: eolConfig,
          stakingProgram: staking.programId,
          stakingConfig: eolCfg.staking,
          stakeAccount,
        })
        .rpc(txOpts),
    );
    const voted = await (eol.account as any).config.fetch(eolConfig);
    console.log("vote yes", voted.voteYes.toString(), "open", voted.voteOpen);
    if (!voted.voteOpen || BigInt(voted.voteYes.toString()) < weight) {
      throw new Error("liquidation vote was not recorded");
    }
    console.log("ACCEPT mint:", mint.toBase58());
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
