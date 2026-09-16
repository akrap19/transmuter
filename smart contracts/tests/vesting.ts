import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";

const SCHEDULE_LINEAR_12M = 2;
const KIND_TEAM = 0;
const KIND_INVESTOR = 1;
const KIND_OTHER = 2;
const TEAM_ALLOC = 1_000_000;
const INVESTOR_ALLOC = 400_000;
const OTHER_ALLOC = 200_000;
const SIX_MONTHS = 180 * 24 * 3600;
const TWELVE_MONTHS = 365 * 24 * 3600;

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function linear12(total: bigint, start: number, now: number): bigint {
  const elapsed = BigInt(now - start);
  const dur = BigInt(TWELVE_MONTHS);
  if (elapsed <= 0n) return 0n;
  if (elapsed >= dur) return total;
  return (total * elapsed) / dur;
}

async function expectCode(p: Promise<unknown>, code: string) {
  try {
    await p;
    expect.fail(`expected ${code}`);
  } catch (err: unknown) {
    expect(String(err)).to.include(code);
  }
}

describe("vesting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const vesting = anchor.workspace.TransmuterVesting as Program;
  const connection = provider.connection;
  const factory = (provider.wallet as anchor.Wallet).payer;

  const eol = Keypair.generate();
  const founder = Keypair.generate();
  const team = Keypair.generate();
  const investor = Keypair.generate();
  const other = Keypair.generate();
  const extraInvestor = Keypair.generate();
  const teamPot = Keypair.generate();
  const investorPot = Keypair.generate();

  let mint: PublicKey;
  let config: PublicKey;
  let teamEntry: PublicKey;
  let investorEntry: PublicKey;
  let otherEntry: PublicKey;
  let extraEntry: PublicKey;
  let teamAta: PublicKey;
  let investorAta: PublicKey;
  let startTs = 0;
  let stampTs = 0;
  let expectedTeamVested = 0n;
  let teamPotAfterBurn = 0n;

  async function fund(kp: Keypair) {
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  it("initialize reverts on a zero TEAM allocation", async () => {
    await Promise.all([eol, founder, team, investor, other].map(fund));
    mint = await createMint(connection, factory, factory.publicKey, null, 6);
    [config] = pda([Buffer.from("config"), mint.toBuffer()], vesting.programId);
    [teamEntry] = pda(
      [Buffer.from("entry"), config.toBuffer(), team.publicKey.toBuffer()],
      vesting.programId,
    );
    await expectCode(
      vesting.methods
        .initialize(SCHEDULE_LINEAR_12M, new anchor.BN(0))
        .accounts({
          payer: factory.publicKey,
          factory: factory.publicKey,
          eolToken: eol.publicKey,
          founder: founder.publicKey,
          mint,
          teamRecipient: team.publicKey,
          config,
          teamPot: teamPot.publicKey,
          investorPot: investorPot.publicKey,
          teamEntry,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([teamPot, investorPot])
        .rpc(),
      "TeamCount",
    );
  });

  it("initialise two pots and exactly one TEAM entry", async () => {
    await vesting.methods
      .initialize(SCHEDULE_LINEAR_12M, new anchor.BN(TEAM_ALLOC))
      .accounts({
        payer: factory.publicKey,
        factory: factory.publicKey,
        eolToken: eol.publicKey,
        founder: founder.publicKey,
        mint,
        teamRecipient: team.publicKey,
        config,
        teamPot: teamPot.publicKey,
        investorPot: investorPot.publicKey,
        teamEntry,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([teamPot, investorPot])
      .rpc();

    const cfg = await vesting.account.vestingConfig.fetch(config);
    expect(cfg.teamCount).to.equal(1);
    expect(cfg.teamAllocated.toNumber()).to.equal(TEAM_ALLOC);
    expect(cfg.investorAllocated.toNumber()).to.equal(0);
    expect(cfg.teamPot.equals(teamPot.publicKey)).to.equal(true);
    expect(cfg.investorPot.equals(investorPot.publicKey)).to.equal(true);
    const entry = await vesting.account.vestingEntry.fetch(teamEntry);
    expect(entry.kind).to.equal(KIND_TEAM);
    expect(entry.totalAllocation.toNumber()).to.equal(TEAM_ALLOC);
  });

  it("claim reverts before startTime is stamped", async () => {
    teamAta = await createAssociatedTokenAccount(
      connection,
      factory,
      mint,
      team.publicKey,
    );
    await expectCode(
      vesting.methods
        .claim()
        .accounts({
          recipient: team.publicKey,
          config,
          entry: teamEntry,
          pot: teamPot.publicKey,
          destination: teamAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([team])
        .rpc(),
      "NotStarted",
    );
  });

  it("only the paired EOL stamps startTime, once, in the past", async () => {
    await expectCode(
      vesting.methods
        .stampStartTime(new anchor.BN(1))
        .accounts({
          eolToken: founder.publicKey,
          config,
        })
        .signers([founder])
        .rpc(),
      "ConstraintHasOne",
    );

    const slot = await connection.getSlot();
    const now = (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);
    startTs = now - SIX_MONTHS;
    await vesting.methods
      .stampStartTime(new anchor.BN(startTs))
      .accounts({ eolToken: eol.publicKey, config })
      .signers([eol])
      .rpc();

    await expectCode(
      vesting.methods
        .stampStartTime(new anchor.BN(startTs))
        .accounts({ eolToken: eol.publicKey, config })
        .signers([eol])
        .rpc(),
      "AlreadyStamped",
    );
  });

  it("founder push: second TEAM reverts; alloc cannot exceed pot; INVESTOR + OTHER accepted", async () => {
    await mintTo(connection, factory, mint, teamPot.publicKey, factory, TEAM_ALLOC + OTHER_ALLOC);
    await mintTo(connection, factory, mint, investorPot.publicKey, factory, INVESTOR_ALLOC);

    await expectCode(
      vesting.methods
        .pushEntry(extraInvestor.publicKey, new anchor.BN(1), KIND_TEAM)
        .accounts({
          founder: founder.publicKey,
          config,
          pot: teamPot.publicKey,
          entry: pda(
            [Buffer.from("entry"), config.toBuffer(), extraInvestor.publicKey.toBuffer()],
            vesting.programId,
          )[0],
          systemProgram: SystemProgram.programId,
        })
        .signers([founder])
        .rpc(),
      "TeamCount",
    );

    [investorEntry] = pda(
      [Buffer.from("entry"), config.toBuffer(), investor.publicKey.toBuffer()],
      vesting.programId,
    );
    await expectCode(
      vesting.methods
        .pushEntry(investor.publicKey, new anchor.BN(INVESTOR_ALLOC + 1), KIND_INVESTOR)
        .accounts({
          founder: founder.publicKey,
          config,
          pot: investorPot.publicKey,
          entry: investorEntry,
          systemProgram: SystemProgram.programId,
        })
        .signers([founder])
        .rpc(),
      "AllocExceedsPot",
    );

    await vesting.methods
      .pushEntry(investor.publicKey, new anchor.BN(INVESTOR_ALLOC), KIND_INVESTOR)
      .accounts({
        founder: founder.publicKey,
        config,
        pot: investorPot.publicKey,
        entry: investorEntry,
        systemProgram: SystemProgram.programId,
      })
      .signers([founder])
      .rpc();

    [otherEntry] = pda(
      [Buffer.from("entry"), config.toBuffer(), other.publicKey.toBuffer()],
      vesting.programId,
    );
    await vesting.methods
      .pushEntry(other.publicKey, new anchor.BN(OTHER_ALLOC), KIND_OTHER)
      .accounts({
        founder: founder.publicKey,
        config,
        pot: teamPot.publicKey,
        entry: otherEntry,
        systemProgram: SystemProgram.programId,
      })
      .signers([founder])
      .rpc();

    const cfg = await vesting.account.vestingConfig.fetch(config);
    expect(cfg.investorAllocated.toNumber()).to.equal(INVESTOR_ALLOC);
    expect(cfg.teamAllocated.toNumber()).to.equal(TEAM_ALLOC + OTHER_ALLOC);
  });

  it("claim cannot pull from the other pot", async () => {
    investorAta = await createAssociatedTokenAccount(
      connection,
      factory,
      mint,
      investor.publicKey,
    );
    await expectCode(
      vesting.methods
        .claim()
        .accounts({
          recipient: investor.publicKey,
          config,
          entry: investorEntry,
          pot: teamPot.publicKey,
          destination: investorAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([investor])
        .rpc(),
      "ConstraintRaw",
    );
  });

  it("notifyLiquidation burns unvested TEAM only; OTHER and INVESTOR survive; rewrite is idempotent", async () => {
    const teamBefore = (await getAccount(connection, teamPot.publicKey)).amount;
    const investorBefore = (await getAccount(connection, investorPot.publicKey)).amount;

    await vesting.methods
      .notifyLiquidation()
      .accounts({
        eolToken: eol.publicKey,
        config,
        mint,
        teamPot: teamPot.publicKey,
        teamEntry,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol])
      .rpc();

    const cfg = await vesting.account.vestingConfig.fetch(config);
    stampTs = cfg.liquidationTimestamp.toNumber();
    expectedTeamVested = linear12(BigInt(TEAM_ALLOC), startTs, stampTs);
    const burned = BigInt(TEAM_ALLOC) - expectedTeamVested;

    const teamAcc = await vesting.account.vestingEntry.fetch(teamEntry);
    expect(BigInt(teamAcc.totalAllocation.toString())).to.equal(expectedTeamVested);

    const teamAfter = (await getAccount(connection, teamPot.publicKey)).amount;
    teamPotAfterBurn = teamAfter;
    expect(teamAfter).to.equal(teamBefore - burned);
    expect((await getAccount(connection, investorPot.publicKey)).amount).to.equal(investorBefore);

    const otherAcc = await vesting.account.vestingEntry.fetch(otherEntry);
    expect(otherAcc.kind).to.equal(KIND_OTHER);
    expect(otherAcc.totalAllocation.toNumber()).to.equal(OTHER_ALLOC);

    const investorAcc = await vesting.account.vestingEntry.fetch(investorEntry);
    expect(investorAcc.totalAllocation.toNumber()).to.equal(INVESTOR_ALLOC);

    await vesting.methods
      .notifyLiquidation()
      .accounts({
        eolToken: eol.publicKey,
        config,
        mint,
        teamPot: teamPot.publicKey,
        teamEntry,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol])
      .rpc();
    expect((await getAccount(connection, teamPot.publicKey)).amount).to.equal(teamPotAfterBurn);
    const teamAgain = await vesting.account.vestingEntry.fetch(teamEntry);
    expect(BigInt(teamAgain.totalAllocation.toString())).to.equal(expectedTeamVested);
  });

  it("team claim after the burn pays exactly vested-at-stamp; investor keeps vesting", async () => {
    await vesting.methods
      .claim()
      .accounts({
        recipient: team.publicKey,
        config,
        entry: teamEntry,
        pot: teamPot.publicKey,
        destination: teamAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([team])
      .rpc();
    expect((await getAccount(connection, teamAta)).amount).to.equal(expectedTeamVested);

    await vesting.methods
      .claim()
      .accounts({
        recipient: investor.publicKey,
        config,
        entry: investorEntry,
        pot: investorPot.publicKey,
        destination: investorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([investor])
      .rpc();
    const got = (await getAccount(connection, investorAta)).amount;
    expect(got > 0n).to.equal(true);
    expect(got < BigInt(INVESTOR_ALLOC)).to.equal(true);
  });

  it("push after the liquidation stamp reverts", async () => {
    [extraEntry] = pda(
      [Buffer.from("entry"), config.toBuffer(), extraInvestor.publicKey.toBuffer()],
      vesting.programId,
    );
    await expectCode(
      vesting.methods
        .pushEntry(extraInvestor.publicKey, new anchor.BN(1), KIND_INVESTOR)
        .accounts({
          founder: founder.publicKey,
          config,
          pot: investorPot.publicKey,
          entry: extraEntry,
          systemProgram: SystemProgram.programId,
        })
        .signers([founder])
        .rpc(),
      "AfterLiquidation",
    );
  });

  it("wallet change can be initiated and cancelled", async () => {
    const next = Keypair.generate();
    await vesting.methods
      .initiateWalletChange(next.publicKey)
      .accounts({ recipient: team.publicKey, entry: teamEntry })
      .signers([team])
      .rpc();
    let entry = await vesting.account.vestingEntry.fetch(teamEntry);
    expect(entry.pendingWallet.equals(next.publicKey)).to.equal(true);
    expect(entry.pendingAfter.toNumber()).to.be.greaterThan(0);

    await vesting.methods
      .cancelWalletChange()
      .accounts({ recipient: team.publicKey, entry: teamEntry })
      .signers([team])
      .rpc();
    entry = await vesting.account.vestingEntry.fetch(teamEntry);
    expect(entry.pendingWallet.equals(PublicKey.default)).to.equal(true);
    expect(entry.pendingAfter.toNumber()).to.equal(0);
  });
});
