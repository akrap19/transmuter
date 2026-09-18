/**
 * Full launch lifecycle (spec Phase 7 / S9).
 *
 * launch → sale fill → finalize → convertTreasury → trade/fees →
 * oracle set_price + snapshot → reserve mint → vote → liquidation → redeem.
 *
 *   yarn lifecycle
 *   ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json yarn lifecycle
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn lifecycle
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  mintTo,
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
import {
  RAYDIUM_CPMM,
  createCpmmUsdcWsolPool,
  postOrWritePyth,
  raydiumInitRemaining,
  type CpmmPool,
} from "./venues";

const DECIMALS = 9;
const SCALE = 1_000_000_000n;
const SALE_PRICE = 1_000_000;
/** Localnet tests used 1e6 supply + 800 SOL in the native pool. Public-devnet cannot fund that. */
const SUPPLY = 100n * SCALE;
const NATIVE_POOL_LAMPORTS = Math.floor(0.25 * LAMPORTS_PER_SOL);
const NATIVE_POOL_USDC = 20_000_000_000n; // 20k USDC
const USER_USDC = 1_000_000_000n; // 1k USDC
const RAYDIUM_USDC = 20_000_000_000n;
const RAYDIUM_WSOL_LAMPORTS = Math.floor(0.25 * LAMPORTS_PER_SOL);
const PUBLIC_DEVNET_RPC = "https://devnet.rpcpool.com";
const OFFICIAL_DEVNET_RPC = "https://api.devnet.solana.com";
const STATUS_ACTIVE = 1;
const STATUS_LIQUIDATING = 3;
const DEFAULT_RPC = "http://127.0.0.1:8899";
const DEFAULT_WALLET = path.join(os.homedir(), ".config", "solana", "id.json");

export type LifecycleResult = {
  convertDone: boolean;
  oracleSnapped: boolean;
  pythLive: boolean;
  raydiumConvert: boolean;
  raydiumLp: boolean;
  reserveMinted: boolean;
  liquidated: boolean;
  redeemed: boolean;
  status: number;
};

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function publicRpcUrl(preferred: string): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  return preferred;
}

function forPublicCluster(base: anchor.AnchorProvider): anchor.AnchorProvider {
  const url = base.connection.rpcEndpoint;
  if (!/devnet|mainnet/i.test(url)) {
    return base;
  }
  return new anchor.AnchorProvider(
    quietConnection(publicRpcUrl(url)),
    base.wallet,
    {
      commitment: "confirmed",
      skipPreflight: /devnet|mainnet/i.test(url),
      maxRetries: 12,
    },
  );
}

function ensureProviderEnv(): void {
  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = DEFAULT_RPC;
  }
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = DEFAULT_WALLET;
  }
  const wallet = process.env.ANCHOR_WALLET;
  const resolved = wallet.startsWith("~")
    ? path.join(os.homedir(), wallet.slice(1))
    : wallet;
  process.env.ANCHOR_WALLET = resolved;
  if (!fs.existsSync(resolved)) {
    throw new Error(`ANCHOR_WALLET not found at ${resolved}`);
  }
}

function walletFromEnv(): anchor.Wallet {
  const raw = JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!, "utf8"));
  return new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(raw)));
}

export async function runLifecycle(
  existing?: anchor.AnchorProvider,
): Promise<LifecycleResult> {
  const provider = forPublicCluster(existing ?? anchor.AnchorProvider.env());
  if (!existing) {
    anchor.setProvider(provider);
  } else if (/devnet|mainnet/i.test(provider.connection.rpcEndpoint)) {
    anchor.setProvider(provider);
  }
  const eol = anchor.workspace.TransmuterEolToken as Program;
  const eolAcc = eol.account as Record<string, { fetch: (k: PublicKey) => Promise<any> }>;
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const dex = anchor.workspace.MockDex as Program;
  const pyth =
    (anchor.workspace as Record<string, Program>).mockPyth ??
    (anchor.workspace as Record<string, Program>).MockPyth;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const publicCluster = /devnet|mainnet/i.test(connection.rpcEndpoint);
  const cu = [
    ...(publicCluster
      ? [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })]
      : []),
    ComputeBudgetProgram.setComputeUnitLimit({
      units: FOUNDER.MAX_COMPUTE_UNITS,
    }),
  ];
  const txOpts = {
    commitment: "confirmed" as const,
    skipPreflight: publicCluster,
    maxRetries: 8,
  };
  async function pace() {
    if (publicCluster) await sleep(600);
  }
  function step(name: string) {
    if (publicCluster) console.log("step:", name);
  }
  await pace();

  const protocolKp = Keypair.generate();
  step("fund protocol");
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: protocolKp.publicKey,
        lamports: LAMPORTS_PER_SOL / 100,
      }),
    ),
    [payer],
    txOpts,
  );

  const csMintKp = Keypair.generate();
  const csMint = csMintKp.publicKey;
  const [csAuth] = mintAuthorityPda(ctoken.programId, csMint);
  const [csConfig] = pda([Buffer.from("config"), csMint.toBuffer()], ctoken.programId);
  const [csReserve] = pda([Buffer.from("reserve"), csMint.toBuffer()], ctoken.programId);
  const [csRevenue] = pda([Buffer.from("revenue"), csMint.toBuffer()], ctoken.programId);
  step("ctoken initialize");
  await ctoken.methods
    .initialize(DECIMALS)
    .accounts({
      payer: payer.publicKey,
      mint: csMint,
      mintAuthority: csAuth,
      config: csConfig,
      reserve: csReserve,
      revenuePot: csRevenue,
      protocolRevenueWallet: protocolKp.publicKey,
      factory: payer.publicKey,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([csMintKp])
    .rpc(txOpts);
    await pace();

  step("usdc mint");
  const usdc = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6,
    undefined,
    txOpts,
  );
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const [mintAuthority] = mintAuthorityPda(eol.programId, mint);
  const [config] = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
  const ctokenTreasury = getAssociatedTokenAddressSync(
    csMint,
    config,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const now = Math.floor(Date.now() / 1000);
  step("eol initialize");
  console.log("mint:", mint.toBase58());
  console.log("config:", config.toBase58());
  await eol.methods
    .initialize({
      decimals: DECIMALS,
      salePrice: new anchor.BN(SALE_PRICE),
      totalSupply: new anchor.BN(SUPPLY.toString()),
      saleBps: 2500,
      lpBps: 1000,
      lpSolShareBps: 5000,
      lpUsdcShareBps: 5000,
      teamBps: 0,
      investorBps: 6500,
      daoBps: 0,
      escrowFundingNeed: new anchor.BN(0),
      saleEnd: new anchor.BN(now + 180),
      sh2MaxSlippageBps: new anchor.BN(FOUNDER.SH2_MAX_SLIPPAGE_BPS),
      governedMintPctBps: 1000,
      reserveMintActivatePct: new anchor.BN(5),
      reserveMintDeactivatePct: new anchor.BN(20),
      reserveMintDurationSecs: new anchor.BN(1),
      liqVoteWindowSecs: new anchor.BN(30),
      convertChunk: new anchor.BN(20_000_000_000),
    })
    .accounts({
      payer: payer.publicKey,
      mint,
      mintAuthority,
      config,
      usdcMint: usdc,
      ctokenMint: csMint,
      factory: payer.publicKey,
      protocolRevenueWallet: protocolKp.publicKey,
      vesting: SystemProgram.programId,
      staking: SystemProgram.programId,
      escrow: SystemProgram.programId,
      ctokenTreasury,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([mintKp])
    .rpc(txOpts);
    await pace();

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ctokenTreasury,
        config,
        csMint,
        TOKEN_2022_PROGRAM_ID,
      ),
    ),
    [payer],
    txOpts,
  );

  const saleUsdc = Keypair.generate();
  const saleToken = Keypair.generate();
  const lpToken = Keypair.generate();
  const teamToken = Keypair.generate();
  const treasuryUsdc = Keypair.generate();
  const feeVault = Keypair.generate();
  step("eol vaults");
  await eol.methods
    .initVaults()
    .accounts({
      payer: payer.publicKey,
      config,
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
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([saleUsdc, saleToken, lpToken, teamToken, treasuryUsdc, feeVault])
    .rpc(txOpts);
    await pace();

  const [eolRecord] = pda(
    [Buffer.from("eol"), csConfig.toBuffer(), mint.toBuffer()],
    ctoken.programId,
  );
  step("register eol");
  await ctoken.methods
    .registerEol(mint)
    .accounts({
      payer: payer.publicKey,
      factory: payer.publicKey,
      config: csConfig,
      authority: config,
      ctokenTreasury,
      eolRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc(txOpts);
    await pace();

  const userUsdc = await createAssociatedTokenAccount(
    connection,
    payer,
    usdc,
    payer.publicKey,
    txOpts,
  );
  await mintTo(connection, payer, usdc, userUsdc, payer, USER_USDC, [], txOpts);
  if (publicCluster) {
    await mintTo(connection, payer, usdc, userUsdc, payer, RAYDIUM_USDC, [], txOpts);
  }

  const vaultA = Keypair.generate();
  const vaultB = Keypair.generate();
  const nativeVaultKp = Keypair.generate();
  const [poolUsdc] = pda(
    [Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()],
    dex.programId,
  );
  const [nativePool] = pda([Buffer.from("native"), usdc.toBuffer()], dex.programId);
  let nativeVault = nativeVaultKp.publicKey;

  let cpmm: CpmmPool | null = null;
  if (publicCluster) {
    step("raydium cpmm usdc/wsol");
    cpmm = await createCpmmUsdcWsolPool(
      connection,
      payer,
      usdc,
      userUsdc,
      RAYDIUM_USDC,
      RAYDIUM_WSOL_LAMPORTS,
      txOpts,
    );
    await sleep(3_000);
    nativeVault = cpmm.usdcVault;
  } else {
    step("dex pools");
    await dex.methods
      .initialize()
      .accounts({
        payer: payer.publicKey,
        withdrawAuthority: config,
        mintA: mint,
        mintB: usdc,
        pool: poolUsdc,
        vaultA: vaultA.publicKey,
        vaultB: vaultB.publicKey,
        tokenProgramA: TOKEN_2022_PROGRAM_ID,
        tokenProgramB: TOKEN_PROGRAM_ID,
      })
      .signers([vaultA, vaultB])
      .rpc(txOpts);
    await pace();

    await dex.methods
      .initializeNative()
      .accounts({
        payer: payer.publicKey,
        withdrawAuthority: config,
        usdcMint: usdc,
        pool: nativePool,
        vaultUsdc: nativeVaultKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([nativeVaultKp])
      .rpc(txOpts);
    await pace();
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: nativePool,
          lamports: NATIVE_POOL_LAMPORTS,
        }),
      ),
      [payer],
      txOpts,
    );
    await mintTo(
      connection,
      payer,
      usdc,
      nativeVaultKp.publicKey,
      payer,
      NATIVE_POOL_USDC,
      [],
      txOpts,
    );
  }

  const [depositPda] = pda(
    [Buffer.from("deposit"), config.toBuffer(), payer.publicKey.toBuffer()],
    eol.programId,
  );

  const cfg0 = await eolAcc.config.fetch(config);
  const saleTokens = BigInt(cfg0.saleTokens.toString());
  const saleUsdcAmt = (saleTokens * BigInt(SALE_PRICE)) / SCALE;
  step("sale deposit");
  await eol.methods
    .deposit(new anchor.BN(saleUsdcAmt.toString()))
    .accounts({
      depositor: payer.publicKey,
      config,
      saleUsdcVault: saleUsdc.publicKey,
      source: userUsdc,
      deposit: depositPda,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc(txOpts);
    await pace();

  step("finalize");
  const configWsol = getAssociatedTokenAddressSync(NATIVE_MINT, config, true);
  let finalizeBuilder = eol.methods.finalize().accounts({
    cranker: payer.publicKey,
    config,
    mint,
    mintAuthority,
    saleUsdcVault: saleUsdc.publicKey,
    saleTokenVault: saleToken.publicKey,
    lpTokenVault: lpToken.publicKey,
    treasuryUsdc: treasuryUsdc.publicKey,
    usdcMint: usdc,
    dexProgram: cpmm ? RAYDIUM_CPMM : dex.programId,
    poolUsdc: cpmm ? cpmm.poolState : poolUsdc,
    poolUsdcVaultA: cpmm ? cpmm.usdcVault : vaultA.publicKey,
    poolUsdcVaultB: cpmm ? cpmm.wsolVault : vaultB.publicKey,
    nativePool: cpmm ? cpmm.poolState : nativePool,
    nativeVault: cpmm ? cpmm.usdcVault : nativeVault,
    escrowProgram: SystemProgram.programId,
    escrowConfig: SystemProgram.programId,
    escrowVault: SystemProgram.programId,
    vestingProgram: SystemProgram.programId,
    vestingConfig: SystemProgram.programId,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    usdcProgram: TOKEN_PROGRAM_ID,
  }).preInstructions(cu);
  if (cpmm) {
    if (!(await connection.getAccountInfo(configWsol))) {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            configWsol,
            config,
            NATIVE_MINT,
          ),
        ),
        [payer],
        txOpts,
      );
    }
    finalizeBuilder = finalizeBuilder.remainingAccounts([
      { pubkey: cpmm.authority, isSigner: false, isWritable: false },
      { pubkey: cpmm.ammConfig, isSigner: false, isWritable: false },
      { pubkey: cpmm.observation, isSigner: false, isWritable: true },
      { pubkey: usdc, isSigner: false, isWritable: false },
      { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
      { pubkey: configWsol, isSigner: false, isWritable: true },
      { pubkey: cpmm.wsolVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]);
  }
  await finalizeBuilder.rpc(cpmm ? { ...txOpts, skipPreflight: false } : txOpts);
  await pace();

  let raydiumLp = false;
  if (cpmm) {
    step("fund lp signer for raydium");
    const [lpSigner] = pda(
      [Buffer.from("lp_signer"), mint.toBuffer()],
      eol.programId,
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: lpSigner,
          lamports: Math.floor(2.5 * LAMPORTS_PER_SOL),
        }),
      ),
      [payer],
      txOpts,
    );
    const lpBal = (await getAccount(
      connection,
      lpToken.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    )).amount;
    const cfgLp = await eolAcc.config.fetch(config);
    const usdcTok = (lpBal * BigInt(cfgLp.lpUsdcShareBps.toString())) / 10_000n;
    const solTok = lpBal - usdcTok;
    const usdcCash = (await getAccount(connection, saleUsdc.publicKey)).amount;
    const wsolBal = (await getAccount(connection, configWsol)).amount;
    const seedOpts = {
      commitment: "confirmed" as const,
      skipPreflight: false,
      maxRetries: 12,
    };
    async function seedLp(
      quoteVault: PublicKey,
      quoteMint: PublicKey,
      quoteProgram: PublicKey,
      tokenAmt: bigint,
      quoteAmt: bigint,
    ) {
      if (tokenAmt === 0n || quoteAmt === 0n) return;
      const rem = raydiumInitRemaining({
        mintA: mint,
        mintB: quoteMint,
        creator: lpSigner,
        creatorAtaA: lpToken.publicKey,
        creatorAtaB: quoteVault,
        tokenProgramA: TOKEN_2022_PROGRAM_ID,
        tokenProgramB: quoteProgram,
      });
      try {
        await eol.methods
          .seedRaydiumLp(
            new anchor.BN(tokenAmt.toString()),
            new anchor.BN(quoteAmt.toString()),
          )
          .accounts({
            cranker: payer.publicKey,
            config,
            mint,
            tokenVault: lpToken.publicKey,
            quoteVault,
            lpSigner,
            dexProgram: RAYDIUM_CPMM,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            quoteProgram,
            systemProgram: SystemProgram.programId,
          })
          .remainingAccounts(rem.keys)
          .preInstructions(cu)
          .rpc(seedOpts);
        console.log("seeded pool", rem.poolState.toBase58());
      } catch (err) {
        const logs =
          err instanceof anchor.web3.SendTransactionError
            ? await err.getLogs(connection).catch(() => null)
            : null;
        console.log("seed_raydium_lp failed:", logs ?? err);
        throw err;
      }
      await sleep(3_000);
    }
    step("raydium eol/usdc");
    await seedLp(saleUsdc.publicKey, usdc, TOKEN_PROGRAM_ID, usdcTok, usdcCash);
    step("raydium eol/wsol");
    await seedLp(configWsol, NATIVE_MINT, TOKEN_PROGRAM_ID, solTok, wsolBal);
    raydiumLp = usdcTok > 0n && usdcCash > 0n && solTok > 0n && wsolBal > 0n;
  }

  const convertAccounts = {
    cranker: payer.publicKey,
    config,
    treasuryUsdc: treasuryUsdc.publicKey,
    dexProgram: cpmm ? RAYDIUM_CPMM : dex.programId,
    nativePool: cpmm ? cpmm.poolState : nativePool,
    nativeVault: cpmm ? cpmm.usdcVault : nativeVault,
    ctokenProgram: ctoken.programId,
    ctokenConfig: csConfig,
    ctokenReserve: csReserve,
    ctokenRevenue: csRevenue,
    ctokenMint: csMint,
    ctokenMintAuthority: csAuth,
    ctokenTreasury,
    eolRecord,
    token2022Ctoken: TOKEN_2022_PROGRAM_ID,
    usdcProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
  step("convertTreasury");
  const convertOpts = {
    commitment: "confirmed" as const,
    skipPreflight: false,
    maxRetries: 12,
  };
  for (let i = 0; i < 16; i++) {
    const cur = await eolAcc.config.fetch(config);
    if (cur.convertDone) break;
    let builder = eol.methods
      .convertTreasury(new anchor.BN("18446744073709551615"), new anchor.BN(1))
      .accounts(convertAccounts)
      .preInstructions(cu);
    if (cpmm) {
      const configWsol = getAssociatedTokenAddressSync(
        NATIVE_MINT,
        config,
        true,
      );
      if (!(await connection.getAccountInfo(configWsol))) {
        await sendAndConfirmTransaction(
          connection,
          new Transaction().add(
            createAssociatedTokenAccountInstruction(
              payer.publicKey,
              configWsol,
              config,
              NATIVE_MINT,
            ),
          ),
          [payer],
          convertOpts,
        );
      }
      builder = builder.remainingAccounts([
        { pubkey: cpmm.authority, isSigner: false, isWritable: false },
        { pubkey: cpmm.ammConfig, isSigner: false, isWritable: false },
        { pubkey: cpmm.observation, isSigner: false, isWritable: true },
        { pubkey: usdc, isSigner: false, isWritable: false },
        { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
        { pubkey: configWsol, isSigner: false, isWritable: true },
        { pubkey: cpmm.wsolVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ]);
    }
    try {
      await builder.rpc(convertOpts);
    } catch (err) {
      const curAfter = await eolAcc.config.fetch(config);
      if (curAfter.convertDone) break;
      const msg = err instanceof Error ? err.message : String(err);
      if (/expired|block height|429|Too many|blockhash/i.test(msg) && i < 15) {
        console.log("convertTreasury retry:", msg);
        await sleep(3_000);
        continue;
      }
      const logs =
        err instanceof anchor.web3.SendTransactionError
          ? await err.getLogs(connection).catch(() => null)
          : null;
      console.log("convertTreasury failed:", logs ?? err);
      throw err;
    }
    await pace();
    if (publicCluster) await sleep(800);
  }
  const converted = await eolAcc.config.fetch(config);
  if (converted.status !== STATUS_ACTIVE || !converted.convertDone) {
    throw new Error("convertTreasury did not finish");
  }

  const userEol = await createAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    txOpts,
    TOKEN_2022_PROGRAM_ID,
  );
  await eol.methods
    .claimTokens()
    .accounts({
      depositor: payer.publicKey,
      config,
      saleTokenVault: saleToken.publicKey,
      destination: userEol,
      mint,
      deposit: depositPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .rpc(txOpts);
    await pace();

  const held = await getAccount(connection, userEol, undefined, TOKEN_2022_PROGRAM_ID);
  const protocolEol = await createAssociatedTokenAccount(
    connection,
    payer,
    mint,
    protocolKp.publicKey,
    txOpts,
    TOKEN_2022_PROGRAM_ID,
  );
  const feeAmt = held.amount / 100n;
  if (feeAmt > 0n) {
    await eol.methods
      .accrueProtocolFees(new anchor.BN(feeAmt.toString()))
      .accounts({
        payer: payer.publicKey,
        config,
        source: userEol,
        feeVault: feeVault.publicKey,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc(txOpts);
    await pace();
    await eol.methods
      .settleProtocol()
      .accounts({
        cranker: payer.publicKey,
        config,
        feeVault: feeVault.publicKey,
        protocolEol,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc(txOpts);
    await pace();
  }

  const [feed] = pda([Buffer.from("price_feed"), payer.publicKey.toBuffer()], pyth.programId);
  if (!(await connection.getAccountInfo(feed))) {
    await pyth.methods
      .initialize(-8)
      .accounts({ payer: payer.publicKey, priceFeed: feed })
      .rpc(txOpts);
    await pace();
  }
  step("pyth PriceUpdateV2");
  const pythPost = await postOrWritePyth({ connection, payer, pyth, opts: txOpts });
  await eol.methods
    .snapshotOracle()
    .accounts({
      cranker: payer.publicKey,
      config,
      mint,
      priceFeed: pythPost.priceUpdate,
      ctokenTreasury,
      treasuryUsdc: treasuryUsdc.publicKey,
    })
    .rpc(txOpts);
  await pace();
  const v2Snap = await eolAcc.config.fetch(config);
  if (Number(v2Snap.oraclePrice.toString()) <= 0) {
    throw new Error("PriceUpdateV2 snapshot did not store a price");
  }
  const snapNow = Math.floor(Date.now() / 1000);
  // Tiny SOL/USD print (expo -8) so cSOL treasury values to ~0 USDC and Path A arms.
  step("oracle set_price + snapshot");
  await pyth.methods
    .setPrice(new anchor.BN(1), new anchor.BN(0), new anchor.BN(snapNow))
    .accounts({ priceFeed: feed, owner: payer.publicKey })
    .rpc(txOpts);
    await pace();
  await eol.methods
    .snapshotOracle()
    .accounts({
      cranker: payer.publicKey,
      config,
      mint,
      priceFeed: feed,
      ctokenTreasury,
      treasuryUsdc: treasuryUsdc.publicKey,
    })
    .rpc(txOpts);
    await pace();
  const afterSnap = await eolAcc.config.fetch(config);
  if (afterSnap.oraclePrice.toString() !== "1") {
    throw new Error("oracle snapshot did not store the set_price print");
  }

  step("reserve mint");
  await sleep(1500);
  await eol.methods
    .openReserveAuto()
    .accounts({ cranker: payer.publicKey, config, mint })
    .rpc(txOpts);
    await pace();
  await eol.methods
    .reserveMint(new anchor.BN(50_000_000))
    .accounts({
      user: payer.publicKey,
      config,
      mint,
      mintAuthority,
      userEol,
      protocolRevenueWallet: protocolKp.publicKey,
      ctokenProgram: ctoken.programId,
      ctokenConfig: csConfig,
      ctokenReserve: csReserve,
      ctokenRevenue: csRevenue,
      ctokenMint: csMint,
      ctokenMintAuthority: csAuth,
      ctokenTreasury,
      eolRecord,
      token2022Ctoken: TOKEN_2022_PROGRAM_ID,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(cu)
    .rpc(txOpts);
    await pace();

  await eol.methods
    .crankVolume(new anchor.BN(0))
    .accounts({ cranker: payer.publicKey, config, mint })
    .rpc(txOpts);
    await pace();
  await eol.methods
    .openTroubleGate()
    .accounts({ cranker: payer.publicKey, config, mint })
    .rpc(txOpts);
    await pace();
  step("liquidation vote");
  await eol.methods
    .openLiquidationVote()
    .accounts({ cranker: payer.publicKey, config, mint })
    .rpc(txOpts);
    await pace();
  const supply = (await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID)).supply;
  await eol.methods
    .castLiquidationVote(true, new anchor.BN(supply.toString()))
    .accounts({
      voter: payer.publicKey,
      config,
      stakingProgram: SystemProgram.programId,
      stakingConfig: SystemProgram.programId,
      stakeAccount: SystemProgram.programId,
    })
    .rpc(txOpts);
    await pace();
  step("execute liquidation");
  await sleep(35_000);
  await eol.methods
    .executeLiquidation()
    .accounts({
      cranker: payer.publicKey,
      config,
      mint,
      treasuryUsdc: treasuryUsdc.publicKey,
      protocolRevenueWallet: protocolKp.publicKey,
      stakingProgram: SystemProgram.programId,
      stakingConfig: payer.publicKey,
      vestingProgram: SystemProgram.programId,
      vestingConfig: payer.publicKey,
      teamPot: payer.publicKey,
      teamEntry: payer.publicKey,
      escrowProgram: SystemProgram.programId,
      escrowConfig: payer.publicKey,
      escrowVault: payer.publicKey,
      ctokenProgram: ctoken.programId,
      ctokenConfig: csConfig,
      ctokenReserve: csReserve,
      ctokenMint: csMint,
      ctokenMintAuthority: csAuth,
      ctokenTreasury,
      eolRecord,
      token2022Ctoken: TOKEN_2022_PROGRAM_ID,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(cu)
    .rpc(txOpts);
    await pace();

  const [redeemState] = pda(
    [Buffer.from("redeem"), config.toBuffer(), payer.publicKey.toBuffer()],
    eol.programId,
  );
  const left = await getAccount(connection, userEol, undefined, TOKEN_2022_PROGRAM_ID);
  const redeemAmt = left.amount / 10n;
  step("redeem");
  if (redeemAmt > 0n) {
    await eol.methods
      .redeem(new anchor.BN(redeemAmt.toString()))
      .accounts({
        user: payer.publicKey,
        config,
        mint,
        userEol,
        treasuryUsdc: treasuryUsdc.publicKey,
        userUsdc,
        redeemState,
        ctokenProgram: ctoken.programId,
        ctokenConfig: csConfig,
        ctokenReserve: csReserve,
        ctokenMint: csMint,
        ctokenMintAuthority: csAuth,
        ctokenTreasury,
        eolRecord,
        token2022Ctoken: TOKEN_2022_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        usdcProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(cu)
      .rpc(txOpts);
    await pace();
  }

  const finalCfg = await eolAcc.config.fetch(config);
  const rec =
    redeemAmt > 0n ? await eolAcc.redeemState.fetch(redeemState) : null;
  return {
    convertDone: finalCfg.convertDone as boolean,
    oracleSnapped: finalCfg.oraclePrice.toString() === "1",
    pythLive: pythPost.live,
    raydiumConvert: cpmm !== null,
    raydiumLp,
    reserveMinted: Number(finalCfg.rmMinted.toString()) > 0,
    liquidated: finalCfg.liquidated as boolean,
    redeemed: rec ? BigInt(rec.eolBurned.toString()) === redeemAmt : redeemAmt === 0n,
    status: finalCfg.status as number,
  };
}

function publicProvider(url: string): anchor.AnchorProvider {
  return new anchor.AnchorProvider(quietConnection(url), walletFromEnv(), {
    commitment: "confirmed",
    skipPreflight: true,
    maxRetries: 12,
  });
}

async function connectPublic(preferred: string): Promise<anchor.AnchorProvider> {
  const first = publicRpcUrl(preferred);
  let provider = publicProvider(first);
  try {
    await provider.connection.getLatestBlockhash("processed");
    return provider;
  } catch {
    const fallback =
      first === OFFICIAL_DEVNET_RPC ? PUBLIC_DEVNET_RPC : OFFICIAL_DEVNET_RPC;
    provider = publicProvider(fallback);
    await provider.connection.getLatestBlockhash("processed");
    return provider;
  }
}

async function main() {
  try {
    ensureProviderEnv();
  } catch (err) {
    console.log(err instanceof Error ? err.message : err);
    return;
  }
  const url = process.env.ANCHOR_PROVIDER_URL!;
  const publicCluster = /devnet|mainnet/i.test(url);
  let provider: anchor.AnchorProvider;
  try {
    provider = publicCluster
      ? await connectPublic(url)
      : forPublicCluster(anchor.AnchorProvider.env());
    if (!publicCluster) {
      await provider.connection.getLatestBlockhash("processed");
    }
  } catch {
    if (publicCluster) {
      console.log(`error: no public-devnet RPC at ${url}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `skip: no validator at ${url} (anchor test tears it down unless --detach)`,
    );
    return;
  }
  anchor.setProvider(provider);
  console.log("transmuter lifecycle keeper");
  console.log("rpc:", provider.connection.rpcEndpoint);
  let lastErr: unknown;
  const attempts = publicCluster ? 1 : 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await runLifecycle(provider);
      console.log("lifecycle:", result);
      if (
        result.status !== STATUS_LIQUIDATING ||
        !result.convertDone ||
        !result.oracleSnapped ||
        !result.reserveMinted ||
        !result.liquidated ||
        !result.redeemed ||
        (publicCluster && !result.raydiumConvert) ||
        (publicCluster && !result.raydiumLp)
      ) {
        process.exitCode = 1;
      }
      return;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`attempt ${attempt} failed:`, msg);
      const lamports = await provider.connection.getBalance(
        provider.wallet.publicKey,
      );
      console.log("wallet lamports:", lamports);
      if (
        attempt < attempts &&
        /429|Blockhash|Too many requests|expired|block height/i.test(msg) &&
        lamports >= LAMPORTS_PER_SOL
      ) {
        await sleep(15_000 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

if (require.main === module) {
  main().catch((err) => {
    console.log(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
