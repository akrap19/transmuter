import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
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
const SUPPLY = 1_000_000n * SCALE;
const SALE_PRICE = 1_000_000;
const STATUS_CREATED = 0;
const STATUS_WIRED = 1;
const STATUS_SALE = 2;
const WIRE_VESTING = 1 << 2;
const WIRE_ESCROW = 1 << 3;
const SALE_WINDOW_MIN = 24 * 3600;

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function u64le(n: number | bigint) {
  return Buffer.from(new anchor.BN(n.toString()).toArray("le", 8));
}

function targetRaise(saleBps: number) {
  return new anchor.BN(saleBps).mul(new anchor.BN(100_000_000));
}

async function expectCode(p: Promise<unknown>, code: string) {
  try {
    await p;
    expect.fail(`expected ${code}`);
  } catch (err: unknown) {
    expect(String(err)).to.include(code);
  }
}

describe("factory", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const factory = anchor.workspace.TransmuterFactory as Program;
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const eol = anchor.workspace.TransmuterEolToken as Program;
  const staking = anchor.workspace.TransmuterStaking as Program;
  const vesting = anchor.workspace.TransmuterVesting as Program;
  const escrow = anchor.workspace.TransmuterRunwayEscrow as Program;
  const dex = anchor.workspace.MockDex as Program;
  const dao = anchor.workspace.TransmuterDao as Program;
  const registry = anchor.workspace.TransmuterRegistry as Program;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const protocolKp = Keypair.generate();
  const teamKp = Keypair.generate();

  let usdc: PublicKey;
  let factoryPda: PublicKey;
  let csol: {
    mint: PublicKey;
    config: PublicKey;
    mintAuthority: PublicKey;
  };
  let cbtc: { mint: PublicKey; config: PublicKey };

  function listingPda(mint: PublicKey) {
    return pda([Buffer.from("ctoken"), mint.toBuffer()], factory.programId);
  }
  function launchPda(id: number) {
    return pda([Buffer.from("launch"), u64le(id)], factory.programId);
  }
  function mintIndexPda(mint: PublicKey) {
    return pda([Buffer.from("mint"), mint.toBuffer()], factory.programId);
  }

  function launchParams(overrides: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000);
    const saleBps = (overrides.saleBps as number | undefined) ?? 7000;
    const lpBps = (overrides.lpBps as number | undefined) ?? 1000;
    const teamBps = (overrides.teamBps as number | undefined) ?? 2000;
    return {
      name: "Alpha",
      symbol: "ALP",
      decimals: DECIMALS,
      saleType: 0,
      salePrice: new anchor.BN(SALE_PRICE),
      targetRaise: targetRaise(saleBps),
      totalSupply: new anchor.BN(SUPPLY.toString()),
      saleBps,
      lpBps,
      lpSolShareBps: 5000,
      lpUsdcShareBps: 5000,
      teamBps,
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
      transferFeeBps: 50,
      feeLpBps: 15,
      feeTreasuryBps: 15,
      feeCtokenBps: 5,
      feeProtocolBps: 15,
      feeCreatorBps: 0,
      feeBurnBps: 0,
      forfeitDest: 0,
      vestingSchedule: 0,
      ...overrides,
    };
  }

  async function createCtoken() {
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const mintAuthority = mintAuthorityPda(ctoken.programId, mint)[0];
    const config = pda([Buffer.from("config"), mint.toBuffer()], ctoken.programId);
    const reserve = pda([Buffer.from("reserve"), mint.toBuffer()], ctoken.programId);
    const revenuePot = pda([Buffer.from("revenue"), mint.toBuffer()], ctoken.programId);
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
        factory: factoryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .rpc();
    return { mint, config, mintAuthority };
  }

  async function addCtoken(mint: PublicKey) {
    await factory.methods
      .addCtoken()
      .accounts({
        authority: payer.publicKey,
        factory: factoryPda,
        mint,
        listing: listingPda(mint),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  function createAccounts(mint: PublicKey, id: number, creator = payer.publicKey) {
    return {
      creator,
      factory: factoryPda,
      mint,
      backingCtoken: csol.mint,
      fallbackCtoken: cbtc.mint,
      backingListing: listingPda(csol.mint),
      fallbackListing: listingPda(cbtc.mint),
      teamRecipient: teamKp.publicKey,
      daoContract: dao.programId,
      launch: launchPda(id),
      mintIndex: mintIndexPda(mint),
      systemProgram: SystemProgram.programId,
    };
  }

  async function createLaunch(
    mint: PublicKey,
    id: number,
    params: ReturnType<typeof launchParams>,
    creator?: Keypair,
  ) {
    const signers = creator ? [creator] : [];
    await factory.methods
      .createLaunch(new anchor.BN(id), params)
      .accounts(createAccounts(mint, id, (creator ?? payer).publicKey))
      .signers(signers)
      .rpc();
  }

  before(async () => {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: protocolKp.publicKey,
          lamports: LAMPORTS_PER_SOL / 20,
        }),
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: teamKp.publicKey,
          lamports: LAMPORTS_PER_SOL / 20,
        }),
      ),
      [payer],
    );
    usdc = await createMint(connection, payer, payer.publicKey, null, 6);
    factoryPda = pda([Buffer.from("factory")], factory.programId);
    await factory.methods
      .initialize()
      .accounts({
        payer: payer.publicKey,
        factory: factoryPda,
        protocolRevenueWallet: protocolKp.publicKey,
        usdcMint: usdc,
        registry: registry.programId,
        dao: dao.programId,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    csol = await createCtoken();
    cbtc = await createCtoken();
    await addCtoken(csol.mint);
    await addCtoken(cbtc.mint);
  });

  it("rejects cSOL as both backing and fallback", async () => {
    const mint = Keypair.generate().publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    const acc = createAccounts(mint, id);
    acc.fallbackCtoken = csol.mint;
    acc.fallbackListing = listingPda(csol.mint);
    await expectCode(
      factory.methods.createLaunch(new anchor.BN(id), launchParams()).accounts(acc).rpc(),
      "FallbackSame",
    );
  });

  it("rejects an unwhitelisted fallback cToken", async () => {
    const mint = Keypair.generate().publicKey;
    const stranger = Keypair.generate().publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    const acc = createAccounts(mint, id);
    acc.fallbackCtoken = stranger;
    acc.fallbackListing = listingPda(stranger);
    await expectCode(
      factory.methods.createLaunch(new anchor.BN(id), launchParams()).accounts(acc).rpc(),
      "AccountNotInitialized",
    );
  });

  it("rejects DUTCH and a to-LP forfeit destination", async () => {
    const mint = Keypair.generate().publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    await expectCode(
      factory.methods
        .createLaunch(new anchor.BN(id), launchParams({ saleType: 1 }))
        .accounts(createAccounts(mint, id))
        .rpc(),
      "SaleType",
    );
    await expectCode(
      factory.methods
        .createLaunch(new anchor.BN(id), launchParams({ forfeitDest: 1 }))
        .accounts(createAccounts(mint, id))
        .rpc(),
      "ForfeitDest",
    );
  });

  it("rejects a sale window under 1 day and a FIXED raise that disagrees with price", async () => {
    const mint = Keypair.generate().publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    const now = Math.floor(Date.now() / 1000);
    await expectCode(
      factory.methods
        .createLaunch(
          new anchor.BN(id),
          launchParams({ saleEnd: new anchor.BN(now + 60) }),
        )
        .accounts(createAccounts(mint, id))
        .rpc(),
      "SaleWindow",
    );
    await expectCode(
      factory.methods
        .createLaunch(
          new anchor.BN(id),
          launchParams({ targetRaise: new anchor.BN(1) }),
        )
        .accounts(createAccounts(mint, id))
        .rpc(),
      "FixedRaise",
    );
  });

  it("rejects investor allocation and an infeasible 26/74 shape", async () => {
    const mint = Keypair.generate().publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    await expectCode(
      factory.methods
        .createLaunch(new anchor.BN(id), launchParams({ investorBps: 100 }))
        .accounts(createAccounts(mint, id))
        .rpc(),
      "InvestorPct",
    );
    await expectCode(
      factory.methods
        .createLaunch(
          new anchor.BN(id),
          launchParams({
            saleBps: 2600,
            lpBps: 7400,
            teamBps: 0,
            targetRaise: targetRaise(2600),
          }),
        )
        .accounts(createAccounts(mint, id))
        .rpc(),
      "Infeasible",
    );
  });

  it("creates a launch in CREATED with creator and snapshotted coefficients", async () => {
    const creator = Keypair.generate();
    const sig = await connection.requestAirdrop(creator.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    const mintKp = Keypair.generate();
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    await createLaunch(mintKp.publicKey, id, launchParams(), creator);
    const launch = await factory.account.launch.fetch(launchPda(id));
    expect(launch.status).to.equal(STATUS_CREATED);
    expect(launch.creator.equals(creator.publicKey)).to.equal(true);
    expect(launch.sh2MaxSlippageBps.toNumber()).to.equal(FOUNDER.SH2_MAX_SLIPPAGE_BPS);
    expect(launch.mintPremiumBps.toNumber()).to.equal(FOUNDER.MINT_PREMIUM_RATE_BPS);
    expect(launch.minRaise.toNumber()).to.equal(0);
    expect((launch.requiredMask as number) & WIRE_VESTING).to.equal(WIRE_VESTING);
    expect((launch.requiredMask as number) & WIRE_ESCROW).to.equal(0);
    const cfg = await factory.account.factoryConfig.fetch(factoryPda);
    expect(cfg.totalLaunches.toNumber()).to.equal(id + 1);
  });

  it("validates new launches against live params but keeps the snapshot on an earlier launch", async () => {
    const mintA = Keypair.generate().publicKey;
    const idA = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    const tight = launchParams({
      saleBps: 6000,
      lpBps: 4000,
      teamBps: 0,
      targetRaise: targetRaise(6000),
    });
    await createLaunch(mintA, idA, tight);
    const before = await factory.account.launch.fetch(launchPda(idA));
    expect(before.sh2MaxSlippageBps.toNumber()).to.equal(50);

    await factory.methods
      .setProtocolParams(new anchor.BN(5_000), new anchor.BN(FOUNDER.MINT_PREMIUM_RATE_BPS))
      .accounts({ authority: payer.publicKey, factory: factoryPda })
      .rpc();

    const mintB = Keypair.generate().publicKey;
    const idB = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    await expectCode(
      factory.methods
        .createLaunch(new anchor.BN(idB), tight)
        .accounts(createAccounts(mintB, idB))
        .rpc(),
      "Infeasible",
    );

    const still = await factory.account.launch.fetch(launchPda(idA));
    expect(still.sh2MaxSlippageBps.toNumber()).to.equal(50);
    expect(still.status).to.equal(STATUS_CREATED);

    await factory.methods
      .setProtocolParams(new anchor.BN(50), new anchor.BN(FOUNDER.MINT_PREMIUM_RATE_BPS))
      .accounts({ authority: payer.publicKey, factory: factoryPda })
      .rpc();
  });

  it("wires CREATED → WIRED → SALE across every sibling and accepts a deposit", async () => {
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    const params = launchParams({
      escrowFundingNeed: new anchor.BN(1_000_000),
    });
    await createLaunch(mint, id, params);

    const launchBefore = await factory.account.launch.fetch(launchPda(id));
    expect((launchBefore.requiredMask as number) & WIRE_ESCROW).to.equal(WIRE_ESCROW);

    const eolConfig = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
    const mintAuthority = mintAuthorityPda(eol.programId, mint)[0];
    const stakingConfig = pda([Buffer.from("config"), mint.toBuffer()], staking.programId);
    const vestingConfig = pda([Buffer.from("config"), mint.toBuffer()], vesting.programId);
    const escrowConfig = pda(
      [Buffer.from("config"), eolConfig.toBuffer(), usdc.toBuffer()],
      escrow.programId,
    );
    const ctokenTreasury = getAssociatedTokenAddressSync(
      csol.mint,
      eolConfig,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    const teamEntry = pda(
      [Buffer.from("entry"), vestingConfig.toBuffer(), teamKp.publicKey.toBuffer()],
      vesting.programId,
    );
    const poolUsdc = pda(
      [Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()],
      dex.programId,
    );
    const nativePool = pda([Buffer.from("native"), usdc.toBuffer()], dex.programId);
    const eolRecord = pda(
      [Buffer.from("eol"), csol.config.toBuffer(), mint.toBuffer()],
      ctoken.programId,
    );

    const stakeVault = Keypair.generate();
    const teamPot = Keypair.generate();
    const investorPot = Keypair.generate();
    const escrowVault = Keypair.generate();
    const vaultA = Keypair.generate();
    const vaultB = Keypair.generate();
    const nativeVault = Keypair.generate();
    const saleUsdc = Keypair.generate();
    const saleToken = Keypair.generate();
    const lpToken = Keypair.generate();
    const teamToken = Keypair.generate();
    const treasuryUsdc = Keypair.generate();
    const feeVault = Keypair.generate();

    await factory.methods
      .wireEol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        mint,
        mintAuthority,
        eolConfig,
        usdcMint: usdc,
        ctokenMint: csol.mint,
        protocolRevenueWallet: protocolKp.publicKey,
        vestingConfig,
        stakingConfig,
        escrowConfig,
        ctokenTreasury,
        eolProgram: eol.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .rpc();

    await factory.methods
      .wireEol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        mint,
        mintAuthority,
        eolConfig,
        usdcMint: usdc,
        ctokenMint: csol.mint,
        protocolRevenueWallet: protocolKp.publicKey,
        vestingConfig,
        stakingConfig,
        escrowConfig,
        ctokenTreasury,
        eolProgram: eol.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .rpc();

    await factory.methods
      .wireStaking()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        mint,
        eolConfig,
        stakingConfig,
        vault: stakeVault.publicKey,
        stakingProgram: staking.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([stakeVault])
      .rpc();

    await factory.methods
      .wireVesting()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        mint,
        eolConfig,
        founder: payer.publicKey,
        teamRecipient: teamKp.publicKey,
        vestingConfig,
        teamPot: teamPot.publicKey,
        investorPot: investorPot.publicKey,
        teamEntry,
        vestingProgram: vesting.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([teamPot, investorPot])
      .rpc();

    await factory.methods
      .wireEscrow()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        eolConfig,
        usdcMint: usdc,
        teamRecipient: teamKp.publicKey,
        dao: dao.programId,
        registry: registry.programId,
        escrowConfig,
        vault: escrowVault.publicKey,
        escrowProgram: escrow.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([escrowVault])
      .rpc();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ctokenTreasury,
          eolConfig,
          csol.mint,
          TOKEN_2022_PROGRAM_ID,
        ),
      ),
      [payer],
    );

    await factory.methods
      .wireRegister()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        eolConfig,
        ctokenProgram: ctoken.programId,
        ctokenConfig: csol.config,
        ctokenTreasury,
        eolRecord,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await factory.methods.wireDao().accounts({
      cranker: payer.publicKey,
      factory: factoryPda,
      launch: launchPda(id),
    }).rpc();

    await factory.methods
      .wirePoolUsdc()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
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
      .rpc();

    await factory.methods
      .wirePoolSol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        eolConfig,
        usdcMint: usdc,
        nativePool,
        vaultUsdc: nativeVault.publicKey,
        dexProgram: dex.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([nativeVault])
      .rpc();

    const wired = await factory.account.launch.fetch(launchPda(id));
    expect(wired.status).to.equal(STATUS_WIRED);
    expect(wired.creator.equals(payer.publicKey)).to.equal(true);

    await factory.methods
      .wireVaults()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
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
      .rpc();

    const sale = await factory.account.launch.fetch(launchPda(id));
    expect(sale.status).to.equal(STATUS_SALE);
    expect(sale.saleOutcome).to.equal(0);
    expect(sale.staking.equals(stakingConfig)).to.equal(true);
    expect(sale.vesting.equals(vestingConfig)).to.equal(true);
    expect(sale.escrow.equals(escrowConfig)).to.equal(true);
    expect(sale.eolConfig.equals(eolConfig)).to.equal(true);

    await factory.methods
      .wireVaults()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
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
      .rpc();

    const userUsdc = await createAssociatedTokenAccount(
      connection,
      payer,
      usdc,
      payer.publicKey,
    );
    await mintTo(connection, payer, usdc, userUsdc, payer, 5_000_000);
    await eol.methods
      .deposit(new anchor.BN(1_000_000))
      .accounts({
        depositor: payer.publicKey,
        config: eolConfig,
        saleUsdcVault: saleUsdc.publicKey,
        source: userUsdc,
        usdcProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await factory.methods
      .syncOutcome()
      .accounts({
        cranker: payer.publicKey,
        launch: launchPda(id),
        eolConfig,
      })
      .rpc();
    const synced = await factory.account.launch.fetch(launchPda(id));
    expect(synced.status).to.equal(STATUS_SALE);
    expect(synced.saleOutcome).to.equal(0);
  });

  it("backing-only launches skip escrow and still reach SALE", async () => {
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const id = (await factory.account.factoryConfig.fetch(factoryPda)).totalLaunches.toNumber();
    await createLaunch(
      mint,
      id,
      launchParams({ saleBps: 9000, lpBps: 1000, teamBps: 0, targetRaise: targetRaise(9000) }),
    );
    const created = await factory.account.launch.fetch(launchPda(id));
    expect((created.requiredMask as number) & WIRE_VESTING).to.equal(0);
    expect((created.requiredMask as number) & WIRE_ESCROW).to.equal(0);

    const eolConfig = pda([Buffer.from("config"), mint.toBuffer()], eol.programId);
    const mintAuthority = mintAuthorityPda(eol.programId, mint)[0];
    const stakingConfig = pda([Buffer.from("config"), mint.toBuffer()], staking.programId);
    const ctokenTreasury = getAssociatedTokenAddressSync(
      csol.mint,
      eolConfig,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    const poolUsdc = pda(
      [Buffer.from("pool"), mint.toBuffer(), usdc.toBuffer()],
      dex.programId,
    );
    const nativePool = pda([Buffer.from("native"), usdc.toBuffer()], dex.programId);
    const eolRecord = pda(
      [Buffer.from("eol"), csol.config.toBuffer(), mint.toBuffer()],
      ctoken.programId,
    );
    const stakeVault = Keypair.generate();
    const vaultA = Keypair.generate();
    const vaultB = Keypair.generate();
    const saleUsdc = Keypair.generate();
    const saleToken = Keypair.generate();
    const lpToken = Keypair.generate();
    const teamToken = Keypair.generate();
    const treasuryUsdc = Keypair.generate();
    const feeVault = Keypair.generate();

    await factory.methods
      .wireEol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        mint,
        mintAuthority,
        eolConfig,
        usdcMint: usdc,
        ctokenMint: csol.mint,
        protocolRevenueWallet: protocolKp.publicKey,
        vestingConfig: SystemProgram.programId,
        stakingConfig,
        escrowConfig: SystemProgram.programId,
        ctokenTreasury,
        eolProgram: eol.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .rpc();

    await factory.methods
      .wireStaking()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        mint,
        eolConfig,
        stakingConfig,
        vault: stakeVault.publicKey,
        stakingProgram: staking.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([stakeVault])
      .rpc();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ctokenTreasury,
          eolConfig,
          csol.mint,
          TOKEN_2022_PROGRAM_ID,
        ),
      ),
      [payer],
    );

    await factory.methods
      .wireRegister()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        eolConfig,
        ctokenProgram: ctoken.programId,
        ctokenConfig: csol.config,
        ctokenTreasury,
        eolRecord,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await factory.methods.wireDao().accounts({
      cranker: payer.publicKey,
      factory: factoryPda,
      launch: launchPda(id),
    }).rpc();

    await factory.methods
      .wirePoolUsdc()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
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
      .rpc();

    const nativeVault = Keypair.generate();
    await factory.methods
      .wirePoolSol()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
        eolConfig,
        usdcMint: usdc,
        nativePool,
        vaultUsdc: nativeVault.publicKey,
        dexProgram: dex.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([nativeVault])
      .rpc();

    const wired = await factory.account.launch.fetch(launchPda(id));
    expect(wired.status).to.equal(STATUS_WIRED);

    await factory.methods
      .wireVaults()
      .accounts({
        cranker: payer.publicKey,
        factory: factoryPda,
        launch: launchPda(id),
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
      .rpc();

    const sale = await factory.account.launch.fetch(launchPda(id));
    expect(sale.status).to.equal(STATUS_SALE);
    expect(sale.escrow.equals(PublicKey.default)).to.equal(true);
    expect(sale.vesting.equals(PublicKey.default)).to.equal(true);
  });
});
