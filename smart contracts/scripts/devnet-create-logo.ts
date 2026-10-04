/**
 * Minimal devnet launch that carries an on-chain metadata URI, so the indexer
 * can resolve a logo for the Explore (/coins) list.
 *
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   METADATA_URI=http://localhost:3010/media/<id> \
 *   NAME="Logo Test" SYMBOL=LOGO \
 *   yarn ts-node --transpile-only scripts/devnet-create-logo.ts
 *
 * Only calls `createLaunch` (enough for the Factory account to appear in the
 * read model via syncFactoryLaunches). It does not wire the launch.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getTokenMetadata,
} from "@solana/spl-token";
import { FOUNDER } from "../tests/read-constants";
import { mintAuthorityPda } from "../tests/pda";

const DECIMALS = 9;
const SCALE = 1_000_000_000n;
const BPS = 10_000n;
const SUPPLY = 10_000n * SCALE;
const SALE_BPS = 9000;
const LP_BPS = 1000;
const SALE_WINDOW = 24 * 3600;
const CSOL = new PublicKey("56Hn5H3KpAbCBefSCJXiWCyRxvWF2qGPKATxibFytcPD");
const CBTC = new PublicKey("FpTP5s3cWYaWMXjsFrtLjZBTPcjvQQHksBFKasVrdAFh");

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function u64le(n: number | bigint) {
  return Buffer.from(new anchor.BN(n.toString()).toArray("le", 8));
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

  const connection = new Connection(process.env.ANCHOR_PROVIDER_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 120_000,
  });
  const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local(), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    maxRetries: 12,
  });
  anchor.setProvider(provider);
  const factory = anchor.workspace.TransmuterFactory as Program;
  const dao = anchor.workspace.TransmuterDao as Program;
  const eol = anchor.workspace.TransmuterEolToken as Program;
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const staking = anchor.workspace.TransmuterStaking as Program;
  const payer = (provider.wallet as anchor.Wallet).payer;

  const metadataUri = process.env.METADATA_URI ?? "";
  const name = process.env.NAME ?? "Logo Test";
  const symbol = process.env.SYMBOL ?? "LOGO";

  const factoryPda = pda([Buffer.from("factory")], factory.programId);
  const cfg = await (factory.account as any).factoryConfig.fetch(factoryPda);
  const premium = BigInt(cfg.mintPremiumBps.toString());
  const slip = BigInt(cfg.sh2MaxSlippageBps.toString());
  const price = salePrice(premium, slip);
  const saleTokens = (SUPPLY * BigInt(SALE_BPS)) / BPS;
  const targetRaise = new anchor.BN(usdcFor(saleTokens, price).toString());

  const id = Number(cfg.totalLaunches);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const launch = pda([Buffer.from("launch"), u64le(id)], factory.programId);
  const mintIndex = pda([Buffer.from("mint"), mint.toBuffer()], factory.programId);
  const now = Math.floor(Date.now() / 1000);
  const cu = [
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: FOUNDER.MAX_COMPUTE_UNITS }),
  ];

  console.log("launch id:", id, "mint:", mint.toBase58(), "metadataUri:", metadataUri);

  const build = () =>
    factory.methods
    .createLaunch(new anchor.BN(id), {
      name,
      symbol,
      metadataUri,
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
      transferFeeBps: 55,
      feeLpBps: 15,
      feeTreasuryBps: 15,
      feeCtokenBps: 10,
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
    .rpc({ commitment: "confirmed", skipPreflight: false, maxRetries: 12 });

  let sig = "";
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      sig = await build();
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`attempt ${attempt} failed:`, msg.slice(0, 160));
      if (attempt === 6 || !/blockhash|expired|block height|429|Too many|timed out|fetch/i.test(msg)) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2_000 * attempt));
    }
  }

  console.log("createLaunch sig:", sig);
  const acc = await (factory.account as any).launch.fetch(launch);
  console.log("on-chain metadata_uri:", acc.metadataUri);
  console.log("CREATED mint:", mint.toBase58());

  // wire_eol creates the Token-2022 mint and writes name/symbol/uri into the
  // mint's on-chain metadata (MetadataPointer -> self + TokenMetadata).
  const eolConfig = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
  const mintAuthority = mintAuthorityPda(eol.programId, mint)[0];
  const stakingConfig = pda([Buffer.from("config"), mint.toBuffer()], staking.programId);
  const csolConfig = pda([Buffer.from("config"), CSOL.toBuffer()], ctoken.programId);
  const ctokenTreasury = getAssociatedTokenAddressSync(
    CSOL,
    eolConfig,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const protocol = cfg.protocolRevenueWallet as PublicKey;
  const usdc = cfg.usdcMint as PublicKey;

  const wire = () =>
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
      .rpc({ commitment: "confirmed", skipPreflight: false, maxRetries: 12 });

  let wsig = "";
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      wsig = await wire();
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`wireEol attempt ${attempt} failed:`, msg.slice(0, 200));
      if (attempt === 6 || !/blockhash|expired|block height|429|Too many|timed out|fetch/i.test(msg)) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2_000 * attempt));
    }
  }
  console.log("wireEol sig:", wsig);

  const md = await getTokenMetadata(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  console.log("=== on-chain Token-2022 metadata ===");
  console.log("  name:  ", md?.name);
  console.log("  symbol:", md?.symbol);
  console.log("  uri:   ", md?.uri);
  if (md?.name !== name || md?.symbol !== symbol || md?.uri !== metadataUri) {
    throw new Error("on-chain metadata does not match requested name/symbol/uri");
  }
  console.log("OK: on-chain metadata matches. mint:", mint.toBase58());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
