import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { FOUNDER } from "./read-constants";
import { mintAuthorityPda } from "./pda";

const DECIMALS = 9;
const SCALE = 1_000_000_000n;
const SALE_PRICE = 1_000_000;

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

async function expectCode(p: Promise<unknown>, code: string) {
  try {
    await p;
    expect.fail(`expected ${code}`);
  } catch (err: unknown) {
    expect(String(err)).to.include(code);
  }
}

describe("oracle snapshot (Pyth layout + mock_pyth)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const eol = anchor.workspace.TransmuterEolToken as Program;
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const pyth =
    (anchor.workspace as Record<string, Program>).mockPyth ??
    (anchor.workspace as Record<string, Program>).MockPyth;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("stores a fresh mock_pyth print and rejects a stale one", async () => {
    const protocolKp = Keypair.generate();
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: protocolKp.publicKey,
          lamports: LAMPORTS_PER_SOL / 50,
        }),
      ),
      [payer],
    );

    const csMintKp = Keypair.generate();
    const csMint = csMintKp.publicKey;
    const [csAuth] = mintAuthorityPda(ctoken.programId, csMint);
    const [csConfig] = pda([Buffer.from("config"), csMint.toBuffer()], ctoken.programId);
    const [csReserve] = pda([Buffer.from("reserve"), csMint.toBuffer()], ctoken.programId);
    const [csRevenue] = pda([Buffer.from("revenue"), csMint.toBuffer()], ctoken.programId);
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
      .rpc();

    const usdc = await createMint(connection, payer, payer.publicKey, null, 6);
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
    await eol.methods
      .initialize({
        decimals: DECIMALS,
        salePrice: new anchor.BN(SALE_PRICE),
        totalSupply: new anchor.BN((1_000_000n * SCALE).toString()),
        saleBps: 2500,
        lpBps: 1000,
        lpSolShareBps: 5000,
        lpUsdcShareBps: 5000,
        teamBps: 0,
        investorBps: 6500,
        daoBps: 0,
        escrowFundingNeed: new anchor.BN(0),
        saleEnd: new anchor.BN(now + 120),
        sh2MaxSlippageBps: new anchor.BN(FOUNDER.SH2_MAX_SLIPPAGE_BPS),
        governedMintPctBps: 1000,
        reserveMintActivatePct: new anchor.BN(5),
        reserveMintDeactivatePct: new anchor.BN(20),
        reserveMintDurationSecs: new anchor.BN(1),
        liqVoteWindowSecs: new anchor.BN(20),
        convertChunk: new anchor.BN(0),
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
      .rpc();

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
    );

    const saleUsdc = Keypair.generate();
    const saleToken = Keypair.generate();
    const lpToken = Keypair.generate();
    const teamToken = Keypair.generate();
    const treasuryUsdc = Keypair.generate();
    const feeVault = Keypair.generate();
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
      .rpc();

    const [feed] = pda([Buffer.from("price_feed"), payer.publicKey.toBuffer()], pyth.programId);
    const feedInfo = await connection.getAccountInfo(feed);
    if (!feedInfo) {
      await pyth.methods
        .initialize(-8)
        .accounts({ payer: payer.publicKey, priceFeed: feed })
        .rpc();
    }

    await pyth.methods
      .setPrice(new anchor.BN(15_000_000_000), new anchor.BN(50_000_000), new anchor.BN(now))
      .accounts({ priceFeed: feed, owner: payer.publicKey })
      .rpc();

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
      .rpc();

    const snapped = await eol.account.config.fetch(config);
    expect(snapped.oraclePrice.toString()).to.equal("15000000000");
    expect(snapped.oracleConf.toString()).to.equal("50000000");
    expect(snapped.oracleExpo).to.equal(-8);

    await pyth.methods
      .setPrice(
        new anchor.BN(15_000_000_000),
        new anchor.BN(50_000_000),
        new anchor.BN(now - FOUNDER.ORACLE_MAX_STALENESS_SECS - 30),
      )
      .accounts({ priceFeed: feed, owner: payer.publicKey })
      .rpc();

    await expectCode(
      eol.methods
        .snapshotOracle()
        .accounts({
          cranker: payer.publicKey,
          config,
          mint,
          priceFeed: feed,
          ctokenTreasury,
          treasuryUsdc: treasuryUsdc.publicKey,
        })
        .rpc(),
      "OracleStale",
    );

    const still = await eol.account.config.fetch(config);
    expect(still.oraclePublishTime.toNumber()).to.equal(now);
  });

  it("snapshot_oracle reads a PriceUpdateV2-shaped account", async () => {
    const protocolKp = Keypair.generate();
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: protocolKp.publicKey,
          lamports: LAMPORTS_PER_SOL / 50,
        }),
      ),
      [payer],
    );
    const csMintKp = Keypair.generate();
    const csMint = csMintKp.publicKey;
    const [csAuth] = mintAuthorityPda(ctoken.programId, csMint);
    const [csConfig] = pda([Buffer.from("config"), csMint.toBuffer()], ctoken.programId);
    const [csReserve] = pda([Buffer.from("reserve"), csMint.toBuffer()], ctoken.programId);
    const [csRevenue] = pda([Buffer.from("revenue"), csMint.toBuffer()], ctoken.programId);
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
      .rpc();
    const usdc = await createMint(connection, payer, payer.publicKey, null, 6);
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
    await eol.methods
      .initialize({
        decimals: DECIMALS,
        salePrice: new anchor.BN(SALE_PRICE),
        totalSupply: new anchor.BN((1_000_000n * SCALE).toString()),
        saleBps: 2500,
        lpBps: 1000,
        lpSolShareBps: 5000,
        lpUsdcShareBps: 5000,
        teamBps: 0,
        investorBps: 6500,
        daoBps: 0,
        escrowFundingNeed: new anchor.BN(0),
        saleEnd: new anchor.BN(now + 120),
        sh2MaxSlippageBps: new anchor.BN(FOUNDER.SH2_MAX_SLIPPAGE_BPS),
        governedMintPctBps: 1000,
        reserveMintActivatePct: new anchor.BN(5),
        reserveMintDeactivatePct: new anchor.BN(20),
        reserveMintDurationSecs: new anchor.BN(1),
        liqVoteWindowSecs: new anchor.BN(20),
        convertChunk: new anchor.BN(0),
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
      .rpc();
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
    );
    const saleUsdc = Keypair.generate();
    const saleToken = Keypair.generate();
    const lpToken = Keypair.generate();
    const teamToken = Keypair.generate();
    const treasuryUsdc = Keypair.generate();
    const feeVault = Keypair.generate();
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
      .rpc();
    const [priceUpdate] = pda(
      [Buffer.from("price_v2"), payer.publicKey.toBuffer()],
      pyth.programId,
    );
    if (!(await connection.getAccountInfo(priceUpdate))) {
      await pyth.methods
        .writeV2(
          new anchor.BN(15_000_000_000),
          new anchor.BN(50_000_000),
          -8,
          new anchor.BN(now),
        )
        .accounts({ payer: payer.publicKey, priceUpdate })
        .rpc();
    }
    await eol.methods
      .snapshotOracle()
      .accounts({
        cranker: payer.publicKey,
        config,
        mint,
        priceFeed: priceUpdate,
        ctokenTreasury,
        treasuryUsdc: treasuryUsdc.publicKey,
      })
      .rpc();
    const snapped = await eol.account.config.fetch(config);
    expect(snapped.oraclePrice.toString()).to.equal("15000000000");
    expect(snapped.oracleExpo).to.equal(-8);
  });
});
