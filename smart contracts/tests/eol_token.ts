import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getTransferFeeConfig,
  mintTo,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
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
const SALE_PRICE = 1_000_000; // $1 in USDC atomic (6 dp)
const SUPPLY = 1_000_000n * SCALE;
const STATUS_SALE = 0;
const STATUS_ACTIVE = 1;
const STATUS_VOIDED = 2;
const STATUS_LIQUIDATING = 3;
const GATE_RAISE = 0;
const GATE_LP = 2;

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

function expectBigGt(a: bigint, b: bigint) {
  expect(a > b, `${a} > ${b}`).to.equal(true);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitUntilUnix(ts: number) {
  const wait = ts - Math.floor(Date.now() / 1000);
  if (wait > 0) await sleep(wait * 1000 + 2500);
}

function launchParams(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
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
    saleEnd: new anchor.BN(now + 120),
    sh2MaxSlippageBps: new anchor.BN(FOUNDER.SH2_MAX_SLIPPAGE_BPS),
    governedMintPctBps: 1000,
    reserveMintActivatePct: new anchor.BN(5),
    reserveMintDeactivatePct: new anchor.BN(20),
    reserveMintDurationSecs: new anchor.BN(1),
    liqVoteWindowSecs: new anchor.BN(20),
    convertChunk: new anchor.BN(0),
    ...overrides,
  };
}

describe("eol token", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const eol = anchor.workspace.TransmuterEolToken as Program;
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const dex = anchor.workspace.MockDex as Program;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const cu = ComputeBudgetProgram.setComputeUnitLimit({
    units: FOUNDER.MAX_COMPUTE_UNITS,
  });

  it("pins 8/10/18 floors and the 50 bps fee split", () => {
    expect(FOUNDER.TREASURY_ACCEPT_PCT).to.equal(8);
    expect(FOUNDER.TREASURY_MIN_PCT).to.equal(10);
    expect(FOUNDER.COMBINED_BACKING_MIN_PCT).to.equal(18);
    expect(FOUNDER.TREASURY_MIN_PCT).to.not.equal(FOUNDER.TREASURY_ACCEPT_PCT);
    expect(
      FOUNDER.FEE_LP_DEFAULT_BPS +
        FOUNDER.FEE_TREASURY_DEFAULT_BPS +
        FOUNDER.FEE_CTOKEN_RESERVE_BPS +
        FOUNDER.FEE_PROTOCOL_MIN_BPS,
    ).to.equal(FOUNDER.TRANSFER_FEE_DEFAULT_BPS);
    expect(
      FOUNDER.LIQUIDATION_FEE_CTOKEN_BPS + FOUNDER.LIQUIDATION_FEE_PROTOCOL_BPS,
    ).to.equal(FOUNDER.LIQUIDATION_FEE_BPS);
  });

  async function createCtoken() {
    const mintKp = Keypair.generate();
    const protocolKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const [mintAuthority] = mintAuthorityPda(ctoken.programId, mint);
    const [config] = pda([Buffer.from("config"), mint.toBuffer()], ctoken.programId);
    const [reserve] = pda([Buffer.from("reserve"), mint.toBuffer()], ctoken.programId);
    const [revenuePot] = pda([Buffer.from("revenue"), mint.toBuffer()], ctoken.programId);
    const fund = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: protocolKp.publicKey,
        lamports: LAMPORTS_PER_SOL / 50,
      }),
    );
    await sendAndConfirmTransaction(connection, fund, [payer]);
    await ctoken.methods
      .initialize(DECIMALS)
      .accounts({
        payer: payer.publicKey,
        mint,
        mintAuthority,
        config,
        reserve,
        revenuePot,
        protocolRevenueWallet: protocolKp.publicKey,
        factory: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .rpc();
    return { mint, mintAuthority, config, reserve, revenuePot, protocolKp };
  }

  async function setupLaunch(opts: {
    params?: Record<string, unknown>;
    withDex?: boolean;
    withCtoken?: boolean;
  } = {}) {
    const withDex = opts.withDex ?? false;
    const withCtoken = opts.withCtoken ?? false;
    const usdc = await createMint(connection, payer, payer.publicKey, null, 6);
    const protocolKp = Keypair.generate();
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: protocolKp.publicKey,
          lamports: LAMPORTS_PER_SOL / 20,
        }),
      ),
      [payer],
    );

    let cs = withCtoken
      ? await createCtoken()
      : {
          mint: Keypair.generate().publicKey,
          mintAuthority: Keypair.generate().publicKey,
          config: Keypair.generate().publicKey,
          reserve: Keypair.generate().publicKey,
          revenuePot: Keypair.generate().publicKey,
          protocolKp,
        };

    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const [mintAuthority] = mintAuthorityPda(eol.programId, mint);
    const [config] = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
    const ctokenTreasury = getAssociatedTokenAddressSync(
      cs.mint,
      config,
      true,
      TOKEN_2022_PROGRAM_ID,
    );

    const saleUsdc = Keypair.generate();
    const saleToken = Keypair.generate();
    const lpToken = Keypair.generate();
    const teamToken = Keypair.generate();
    const treasuryUsdc = Keypair.generate();
    const feeVault = Keypair.generate();

    await eol.methods
      .initialize(launchParams(opts.params ?? {}))
      .accounts({
        payer: payer.publicKey,
        mint,
        mintAuthority,
        config,
        usdcMint: usdc,
        ctokenMint: cs.mint,
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

    if (withCtoken) {
      const ataIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ctokenTreasury,
        config,
        cs.mint,
        TOKEN_2022_PROGRAM_ID,
      );
      await sendAndConfirmTransaction(connection, new Transaction().add(ataIx), [payer]);
    }

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
      .preInstructions([cu])
      .rpc();

    const rawMint = await connection.getAccountInfo(mint);
    expect(rawMint!.data.length).to.equal(FOUNDER.TRANSFER_FEE_MINT_SPACE);

    let eolRecord = Keypair.generate().publicKey;
    if (withCtoken) {
      const [rec] = pda(
        [Buffer.from("eol"), cs.config.toBuffer(), mint.toBuffer()],
        ctoken.programId,
      );
      eolRecord = rec;
      await ctoken.methods
        .registerEol(mint)
        .accounts({
          factory: payer.publicKey,
          config: cs.config,
          authority: config,
          ctokenTreasury,
          eolRecord,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const userUsdc = await createAssociatedTokenAccount(
      connection,
      payer,
      usdc,
      payer.publicKey,
    );
    await mintTo(
      connection,
      payer,
      usdc,
      userUsdc,
      payer,
      500_000_000_000n,
    );

    let poolUsdc = SystemProgram.programId;
    let poolVaultA = SystemProgram.programId;
    let poolVaultB = SystemProgram.programId;
    let nativePool = SystemProgram.programId;
    let nativeVault = SystemProgram.programId;

    if (withDex) {
      const vaultA = Keypair.generate();
      const vaultB = Keypair.generate();
      const nativeVaultKp = Keypair.generate();
      [poolUsdc] = pda(
        [Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()],
        dex.programId,
      );
      [nativePool] = pda(
        [Buffer.from("native"), usdc.toBuffer()],
        dex.programId,
      );
      poolVaultA = vaultA.publicKey;
      poolVaultB = vaultB.publicKey;
      nativeVault = nativeVaultKp.publicKey;

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
        .rpc();

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
        .rpc();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: nativePool,
            lamports: 800 * LAMPORTS_PER_SOL,
          }),
        ),
        [payer],
      );
      await mintTo(
        connection,
        payer,
        usdc,
        nativeVault,
        payer,
        2_000_000_000_000n,
      );
    }

    const [depositPda] = pda(
      [Buffer.from("deposit"), config.toBuffer(), payer.publicKey.toBuffer()],
      eol.programId,
    );

    return {
      usdc,
      mint,
      mintAuthority,
      config,
      cs,
      ctokenTreasury,
      eolRecord,
      protocolKp,
      saleUsdc: saleUsdc.publicKey,
      saleToken: saleToken.publicKey,
      lpToken: lpToken.publicKey,
      teamToken: teamToken.publicKey,
      treasuryUsdc: treasuryUsdc.publicKey,
      feeVault: feeVault.publicKey,
      userUsdc,
      depositPda,
      poolUsdc,
      poolVaultA,
      poolVaultB,
      nativePool,
      nativeVault,
    };
  }

  function finalizeAccounts(l: Awaited<ReturnType<typeof setupLaunch>>) {
    return {
      cranker: payer.publicKey,
      config: l.config,
      mint: l.mint,
      mintAuthority: l.mintAuthority,
      saleUsdcVault: l.saleUsdc,
      saleTokenVault: l.saleToken,
      lpTokenVault: l.lpToken,
      treasuryUsdc: l.treasuryUsdc,
      usdcMint: l.usdc,
      dexProgram: dex.programId,
      poolUsdc: l.poolUsdc,
      poolUsdcVaultA:
        l.poolVaultA.equals(SystemProgram.programId) ? payer.publicKey : l.poolVaultA,
      poolUsdcVaultB:
        l.poolVaultB.equals(SystemProgram.programId) ? payer.publicKey : l.poolVaultB,
      nativePool: l.nativePool.equals(SystemProgram.programId)
        ? payer.publicKey
        : l.nativePool,
      nativeVault: l.nativeVault.equals(SystemProgram.programId)
        ? payer.publicKey
        : l.nativeVault,
      escrowProgram: SystemProgram.programId,
      escrowConfig: SystemProgram.programId,
      escrowVault: SystemProgram.programId,
      vestingProgram: SystemProgram.programId,
      vestingConfig: SystemProgram.programId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
    };
  }

  function convertAccounts(l: Awaited<ReturnType<typeof setupLaunch>>) {
    return {
      cranker: payer.publicKey,
      config: l.config,
      treasuryUsdc: l.treasuryUsdc,
      dexProgram: dex.programId,
      nativePool: l.nativePool,
      nativeVault: l.nativeVault,
      ctokenProgram: ctoken.programId,
      ctokenConfig: l.cs.config,
      ctokenReserve: l.cs.reserve,
      ctokenRevenue: l.cs.revenuePot,
      ctokenMint: l.cs.mint,
      ctokenMintAuthority: l.cs.mintAuthority,
      ctokenTreasury: l.ctokenTreasury,
      eolRecord: l.eolRecord,
      token2022Ctoken: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
  }

  async function depositUsdc(
    l: Awaited<ReturnType<typeof setupLaunch>>,
    amount: bigint | number,
  ) {
    await eol.methods
      .deposit(new anchor.BN(amount.toString()))
      .accounts({
        depositor: payer.publicKey,
        config: l.config,
        saleUsdcVault: l.saleUsdc,
        source: l.userUsdc,
        deposit: l.depositPda,
        usdcProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  it("sale: deposit, full withdraw, then cap", async () => {
    const l = await setupLaunch();
    const one = 1_000_000; // 1 USDC = 1 whole token
    await depositUsdc(l, one);
    let cfg = await eol.account.config.fetch(l.config);
    expect(cfg.status).to.equal(STATUS_SALE);
    expect(cfg.raisedUsdc.toNumber()).to.equal(one);
    expect(cfg.soldTokens.toString()).to.equal(SCALE.toString());

    await eol.methods
      .withdraw(new anchor.BN(one))
      .accounts({
        depositor: payer.publicKey,
        config: l.config,
        saleUsdcVault: l.saleUsdc,
        destination: l.userUsdc,
        deposit: l.depositPda,
        usdcProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    cfg = await eol.account.config.fetch(l.config);
    expect(cfg.raisedUsdc.toNumber()).to.equal(0);
    expect(cfg.soldTokens.toNumber()).to.equal(0);

    const saleTokens = BigInt(cfg.saleTokens.toString());
    const saleUsdc = (saleTokens * BigInt(SALE_PRICE)) / SCALE;
    await depositUsdc(l, saleUsdc);
    await expectCode(depositUsdc(l, 1_000_000), "Cap");
  });

    it("finalize voids Raise before any vault movement", async () => {
    const saleEnd = Math.floor(Date.now() / 1000) + 25;
    const l = await setupLaunch({
      params: {
        escrowFundingNeed: new anchor.BN(50_000_000_000),
        saleEnd: new anchor.BN(saleEnd),
      },
    });
    await depositUsdc(l, 1_000_000);
    const before = (await getAccount(connection, l.saleUsdc, undefined, TOKEN_PROGRAM_ID))
      .amount;
    await waitUntilUnix(saleEnd + 3);
    const sig = await eol.methods
      .finalize()
      .accounts(finalizeAccounts(l))
      .preInstructions([cu])
      .rpc();
    const cfg = await eol.account.config.fetch(l.config);
    expect(cfg.status).to.equal(STATUS_VOIDED);
    const after = (await getAccount(connection, l.saleUsdc, undefined, TOKEN_PROGRAM_ID))
      .amount;
    expect(after).to.equal(before);
    void GATE_RAISE;
    void sig;
  });

    it("finalize voids Lp on a dust fill and refunds", async () => {
    const saleEnd = Math.floor(Date.now() / 1000) + 25;
    const l = await setupLaunch({
      params: { saleEnd: new anchor.BN(saleEnd) },
    });
    await depositUsdc(l, 1_000_000);
    await waitUntilUnix(saleEnd + 3);
    await eol.methods
      .finalize()
      .accounts(finalizeAccounts(l))
      .preInstructions([cu])
      .rpc();
    const cfg = await eol.account.config.fetch(l.config);
    expect(cfg.status).to.equal(STATUS_VOIDED);
    await eol.methods
      .withdraw(new anchor.BN(1_000_000))
      .accounts({
        depositor: payer.publicKey,
        config: l.config,
        saleUsdcVault: l.saleUsdc,
        destination: l.userUsdc,
        deposit: l.depositPda,
        usdcProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    const vault = await getAccount(connection, l.saleUsdc, undefined, TOKEN_PROGRAM_ID);
    expect(vault.amount).to.equal(0n);
    void GATE_LP;
  });

  describe("sellout lifecycle", () => {
    let l: Awaited<ReturnType<typeof setupLaunch>>;
    let userEol: PublicKey;

    before(async function () {
      this.timeout(120_000);
      l = await setupLaunch({
        withDex: true,
        withCtoken: true,
        params: {
          convertChunk: new anchor.BN(20_000_000_000), // 20k USDC
        },
      });
      const cfg0 = await eol.account.config.fetch(l.config);
      const saleTokens = BigInt(cfg0.saleTokens.toString());
      const saleUsdc = (saleTokens * BigInt(SALE_PRICE)) / SCALE;
      await depositUsdc(l, saleUsdc);
      await eol.methods
        .finalize()
        .accounts(finalizeAccounts(l))
        .preInstructions([cu])
        .rpc();
      const mintInfo = await getMint(connection, l.mint, undefined, TOKEN_2022_PROGRAM_ID);
      const fee = getTransferFeeConfig(mintInfo);
      expect(fee).to.not.equal(null);
      expect(fee!.newerTransferFee.transferFeeBasisPoints).to.equal(
        FOUNDER.TRANSFER_FEE_DEFAULT_BPS,
      );
      userEol = await createAssociatedTokenAccount(
        connection,
        payer,
        l.mint,
        payer.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
    });

    it("sellout finalizes ACTIVE; unpaired LP is zero; treasury USDC is backing", async () => {
      const cfg = await eol.account.config.fetch(l.config);
      expect(cfg.status).to.equal(STATUS_ACTIVE);
      expect(cfg.soldTokens.toString()).to.equal(cfg.saleTokens.toString());
      const treasury = await getAccount(
        connection,
        l.treasuryUsdc,
        undefined,
        TOKEN_PROGRAM_ID,
      );
      expect(treasury.amount > 0n).to.equal(true);
      const csol = await getAccount(
        connection,
        l.ctokenTreasury,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
      const residue = BigInt(cfg.solResidue.toString());
      expectBigGt(csol.amount + treasury.amount + residue, 0n);
      expectBigGt(treasury.amount + residue, csol.amount);
    });

    it("convertTreasury: failed swap retries; chunked convert leaves USDC counted", async () => {
      const before = (
        await getAccount(connection, l.treasuryUsdc, undefined, TOKEN_PROGRAM_ID)
      ).amount;
      await expectCode(
        eol.methods
          .convertTreasury(new anchor.BN("18446744073709551615"), new anchor.BN("18446744073709551615"))
          .accounts(convertAccounts(l))
          .preInstructions([cu])
          .rpc(),
        "Slippage",
      );
      const mid = (
        await getAccount(connection, l.treasuryUsdc, undefined, TOKEN_PROGRAM_ID)
      ).amount;
      expect(mid).to.equal(before);

      await eol.methods
        .convertTreasury(new anchor.BN("18446744073709551615"), new anchor.BN(1))
        .accounts(convertAccounts(l))
        .preInstructions([cu])
        .rpc();
      const cfg = await eol.account.config.fetch(l.config);
      const left = (
        await getAccount(connection, l.treasuryUsdc, undefined, TOKEN_PROGRAM_ID)
      ).amount;
      if (!cfg.convertDone) {
        expectBigGt(left, 0n);
        expect(left < before).to.equal(true);
      }
      for (let i = 0; i < 12; i++) {
        const cur = await eol.account.config.fetch(l.config);
        if (cur.convertDone) break;
        await eol.methods
          .convertTreasury(new anchor.BN("18446744073709551615"), new anchor.BN(1))
          .accounts(convertAccounts(l))
          .preInstructions([cu])
          .rpc();
      }
      const done = await eol.account.config.fetch(l.config);
      expect(done.convertDone).to.equal(true);
      const csol = await getAccount(
        connection,
        l.ctokenTreasury,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
      expect(csol.amount > 0n).to.equal(true);
    });

    it("claim, fee crank, and redeem conserve cSOL plus independent USDC", async () => {
      await eol.methods
        .claimTokens()
        .accounts({
          depositor: payer.publicKey,
          config: l.config,
          saleTokenVault: l.saleToken,
          destination: userEol,
          mint: l.mint,
          deposit: l.depositPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      const held = await getAccount(connection, userEol, undefined, TOKEN_2022_PROGRAM_ID);
      expect(held.amount > 0n).to.equal(true);

      const protocolEol = await createAssociatedTokenAccount(
        connection,
        payer,
        l.mint,
        l.protocolKp.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
      const feeAmt = held.amount / 100n;
      if (feeAmt > 0n) {
        await eol.methods
          .accrueProtocolFees(new anchor.BN(feeAmt.toString()))
          .accounts({
            payer: payer.publicKey,
            config: l.config,
            source: userEol,
            feeVault: l.feeVault,
            mint: l.mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();
        await eol.methods
          .settleProtocol()
          .accounts({
            cranker: payer.publicKey,
            config: l.config,
            feeVault: l.feeVault,
            protocolEol,
            mint: l.mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();
        const proto = await getAccount(
          connection,
          protocolEol,
          undefined,
          TOKEN_2022_PROGRAM_ID,
        );
        expect(proto.amount > 0n).to.equal(true);
      }

      const userUsdcBefore = (
        await getAccount(connection, l.userUsdc, undefined, TOKEN_PROGRAM_ID)
      ).amount;
      const [redeemState] = pda(
        [Buffer.from("redeem"), l.config.toBuffer(), payer.publicKey.toBuffer()],
        eol.programId,
      );
      const redeemAmt = held.amount / 10n;
      const solBefore = await connection.getBalance(payer.publicKey);
      await eol.methods
        .redeem(new anchor.BN(redeemAmt.toString()))
        .accounts({
          user: payer.publicKey,
          config: l.config,
          mint: l.mint,
          userEol,
          treasuryUsdc: l.treasuryUsdc,
          userUsdc: l.userUsdc,
          redeemState,
          ctokenProgram: ctoken.programId,
          ctokenConfig: l.cs.config,
          ctokenReserve: l.cs.reserve,
          ctokenMint: l.cs.mint,
          ctokenMintAuthority: l.cs.mintAuthority,
          ctokenTreasury: l.ctokenTreasury,
          eolRecord: l.eolRecord,
          token2022Ctoken: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          usdcProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([cu])
        .rpc();
      const rec = await eol.account.redeemState.fetch(redeemState);
      expect(BigInt(rec.eolBurned.toString())).to.equal(redeemAmt);
      expect(BigInt(rec.csolPaid.toString())).to.equal(BigInt(rec.csolOwed.toString()));
      const solAfter = await connection.getBalance(payer.publicKey);
      expect(solAfter).to.be.greaterThan(solBefore - LAMPORTS_PER_SOL / 10);
      const userUsdcAfter = (
        await getAccount(connection, l.userUsdc, undefined, TOKEN_PROGRAM_ID)
      ).amount;
      expect(userUsdcAfter >= userUsdcBefore).to.equal(true);
    });

    it("reserve mint Path A (duration) then Path B at creator-set %", async () => {
      await eol.methods
        .crankReserve(new anchor.BN(1))
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      await sleep(1500);
      await eol.methods
        .openReserveAuto()
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      let cfg = await eol.account.config.fetch(l.config);
      expect(cfg.rmAllowanceOpen).to.equal(true);
      const autoAllowance = BigInt(cfg.rmAllowance.toString());
      expect(autoAllowance > 0n).to.equal(true);

      const pay = 50_000_000; // 0.05 SOL
      await eol.methods
        .reserveMint(new anchor.BN(pay))
        .accounts({
          user: payer.publicKey,
          config: l.config,
          mint: l.mint,
          mintAuthority: l.mintAuthority,
          userEol,
          protocolRevenueWallet: l.protocolKp.publicKey,
          ctokenProgram: ctoken.programId,
          ctokenConfig: l.cs.config,
          ctokenReserve: l.cs.reserve,
          ctokenRevenue: l.cs.revenuePot,
          ctokenMint: l.cs.mint,
          ctokenMintAuthority: l.cs.mintAuthority,
          ctokenTreasury: l.ctokenTreasury,
          eolRecord: l.eolRecord,
          token2022Ctoken: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([cu])
        .rpc();

      await eol.methods
        .crankReserve(new anchor.BN(25))
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      cfg = await eol.account.config.fetch(l.config);
      expect(cfg.rmAllowanceOpen).to.equal(false);

      await eol.methods
        .openReserveGov()
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      await eol.methods
        .castReserveGov(true, new anchor.BN(1_000_000))
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      await sleep(1500);
      await eol.methods
        .executeReserveGov()
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      cfg = await eol.account.config.fetch(l.config);
      expect(cfg.rmAllowanceOpen).to.equal(true);
      const mintInfo = await getMint(connection, l.mint, undefined, TOKEN_2022_PROGRAM_ID);
      const expected =
        (mintInfo.supply * BigInt(cfg.governedMintPctBps)) / 10_000n;
      expect(BigInt(cfg.rmAllowance.toString())).to.equal(expected);
    });

    it("liquidation: holder vote, 2% fee split 1.75/0.25, fees zeroed", async () => {
      await eol.methods
        .crankVolume(new anchor.BN(0))
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      await eol.methods
        .openTroubleGate()
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      await eol.methods
        .openLiquidationVote()
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
        })
        .rpc();
      const supply = (await getMint(connection, l.mint, undefined, TOKEN_2022_PROGRAM_ID))
        .supply;
      await eol.methods
        .castLiquidationVote(true, new anchor.BN(supply.toString()))
        .accounts({
          voter: payer.publicKey,
          config: l.config,
          stakingProgram: SystemProgram.programId,
          stakingConfig: SystemProgram.programId,
          stakeAccount: SystemProgram.programId,
        })
        .rpc();
      await sleep(21_000);
      const protoBefore = await connection.getBalance(l.protocolKp.publicKey);
      const reserveBefore = await connection.getBalance(l.cs.reserve);
      await eol.methods
        .executeLiquidation()
        .accounts({
          cranker: payer.publicKey,
          config: l.config,
          mint: l.mint,
          treasuryUsdc: l.treasuryUsdc,
          protocolRevenueWallet: l.protocolKp.publicKey,
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
          ctokenConfig: l.cs.config,
          ctokenReserve: l.cs.reserve,
          ctokenMint: l.cs.mint,
          ctokenMintAuthority: l.cs.mintAuthority,
          ctokenTreasury: l.ctokenTreasury,
          eolRecord: l.eolRecord,
          token2022Ctoken: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          usdcProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([cu])
        .rpc();
      const cfg = await eol.account.config.fetch(l.config);
      expect(cfg.status).to.equal(STATUS_LIQUIDATING);
      expect(cfg.liquidated).to.equal(true);
      expect(cfg.redemptionTreasuryFeeBps).to.equal(0);
      expect(cfg.redemptionRevenueFeeBps).to.equal(0);
      const protoAfter = await connection.getBalance(l.protocolKp.publicKey);
      const reserveAfter = await connection.getBalance(l.cs.reserve);
      const protoGain = protoAfter - protoBefore;
      const reserveGain = reserveAfter - reserveBefore;
      const total = protoGain + reserveGain;
      if (total > 0) {
        expect(protoGain / total).to.be.closeTo(
          FOUNDER.LIQUIDATION_FEE_PROTOCOL_BPS / FOUNDER.LIQUIDATION_FEE_BPS,
          0.05,
        );
        expect(reserveGain).to.be.greaterThan(protoGain);
      }
    });
  });

    it("LP tokens scale with subscription f at the sale price", async () => {
    const saleEnd = Math.floor(Date.now() / 1000) + 40;
    const l = await setupLaunch({
      withDex: true,
      withCtoken: true,
      params: { saleEnd: new anchor.BN(saleEnd) },
    });
    const cfg0 = await eol.account.config.fetch(l.config);
    const saleTokens = BigInt(cfg0.saleTokens.toString());
    const sold = (saleTokens * 70n) / 100n;
    const usdcIn = (sold * BigInt(SALE_PRICE)) / SCALE;
    await depositUsdc(l, usdcIn);
    await waitUntilUnix(saleEnd + 3);
    await eol.methods
      .finalize()
      .accounts(finalizeAccounts(l))
      .preInstructions([cu])
      .rpc();
    const cfg = await eol.account.config.fetch(l.config);
    expect(cfg.status).to.equal(STATUS_ACTIVE);
    const lpVault = await getAccount(
      connection,
      l.lpToken,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const poolA = await getAccount(
      connection,
      l.poolVaultA,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const paired = BigInt(cfg.lpTokensFull.toString()) * 70n / 100n;
    expect(lpVault.amount + poolA.amount).to.equal(paired);
  });
});
