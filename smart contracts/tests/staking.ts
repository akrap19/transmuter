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

const STAKE = 500_000;

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

describe("staking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const staking = anchor.workspace.TransmuterStaking as Program;
  const connection = provider.connection;
  const factory = (provider.wallet as anchor.Wallet).payer;

  const eol = Keypair.generate();
  const owner = Keypair.generate();
  const other = Keypair.generate();
  const vault = Keypair.generate();
  const voteId = Keypair.generate();

  let mint: PublicKey;
  let config: PublicKey;
  let stakeAccount: PublicKey;
  let otherStake: PublicKey;
  let snapshot: PublicKey;
  let ownerAta: PublicKey;
  let otherAta: PublicKey;

  async function fund(kp: Keypair) {
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  it("initialise with fee_bps = 0 (free both directions)", async () => {
    await Promise.all([eol, owner, other].map(fund));
    mint = await createMint(connection, factory, factory.publicKey, null, 6);
    [config] = pda([Buffer.from("config"), mint.toBuffer()], staking.programId);
    [stakeAccount] = pda(
      [Buffer.from("stake"), config.toBuffer(), owner.publicKey.toBuffer()],
      staking.programId,
    );
    [otherStake] = pda(
      [Buffer.from("stake"), config.toBuffer(), other.publicKey.toBuffer()],
      staking.programId,
    );
    [snapshot] = pda(
      [
        Buffer.from("snapshot"),
        config.toBuffer(),
        voteId.publicKey.toBuffer(),
        owner.publicKey.toBuffer(),
      ],
      staking.programId,
    );

    await staking.methods
      .initialize()
      .accounts({
        factory: factory.publicKey,
        eolToken: eol.publicKey,
        mint,
        config,
        vault: vault.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([vault])
      .rpc();

    const cfg = await staking.account.stakeConfig.fetch(config);
    expect(cfg.feeBps).to.equal(0);
    expect(cfg.liquidated).to.equal(false);
  });

  it("stake then unstake only to the staking owner; snapshotWeight freezes weight and total", async () => {
    ownerAta = await createAssociatedTokenAccount(connection, factory, mint, owner.publicKey);
    otherAta = await createAssociatedTokenAccount(connection, factory, mint, other.publicKey);
    await mintTo(connection, factory, mint, ownerAta, factory, STAKE);

    await staking.methods
      .stake(new anchor.BN(STAKE))
      .accounts({
        owner: owner.publicKey,
        config,
        mint,
        vault: vault.publicKey,
        source: ownerAta,
        stakeAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    expect((await getAccount(connection, vault.publicKey)).amount).to.equal(BigInt(STAKE));
    expect((await getAccount(connection, ownerAta)).amount).to.equal(0n);

    await expectCode(
      staking.methods
        .unstake(new anchor.BN(1))
        .accounts({
          owner: owner.publicKey,
          config,
          mint,
          vault: vault.publicKey,
          stakeAccount,
          destination: otherAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc(),
      "ConstraintTokenOwner",
    );

    await staking.methods
      .snapshotWeight()
      .accounts({
        eolToken: eol.publicKey,
        config,
        stakeAccount,
        voteId: voteId.publicKey,
        snapshot,
        systemProgram: SystemProgram.programId,
      })
      .signers([eol])
      .rpc();
    const snap = await staking.account.voteSnapshot.fetch(snapshot);
    expect(snap.weight.toNumber()).to.equal(STAKE);
    expect(snap.totalStakedAtOpen.toNumber()).to.equal(STAKE);
    expect(snap.voter.equals(owner.publicKey)).to.equal(true);

    await staking.methods
      .unstake(new anchor.BN(100_000))
      .accounts({
        owner: owner.publicKey,
        config,
        mint,
        vault: vault.publicKey,
        stakeAccount,
        destination: ownerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
    expect((await getAccount(connection, ownerAta)).amount).to.equal(100_000n);
    const rec = await staking.account.stakeAccount.fetch(stakeAccount);
    expect(rec.amount.toNumber()).to.equal(STAKE - 100_000);
    expect(rec.everStaked.toNumber()).to.equal(STAKE);
    expect(rec.everUnstaked.toNumber()).to.equal(100_000);
    const still = await staking.account.voteSnapshot.fetch(snapshot);
    expect(still.weight.toNumber()).to.equal(STAKE);

    await mintTo(connection, factory, mint, otherAta, factory, 50_000);
    await staking.methods
      .stake(new anchor.BN(50_000))
      .accounts({
        owner: other.publicKey,
        config,
        mint,
        vault: vault.publicKey,
        source: otherAta,
        stakeAccount: otherStake,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([other])
      .rpc();
  });

  it("setVoterLock: latest expiry wins; unstake blocked until then", async () => {
    const far = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    await staking.methods
      .setVoterLock(new anchor.BN(far))
      .accounts({
        eolToken: eol.publicKey,
        config,
        stakeAccount,
      })
      .signers([eol])
      .rpc();
    await staking.methods
      .setVoterLock(new anchor.BN(far - 60))
      .accounts({
        eolToken: eol.publicKey,
        config,
        stakeAccount,
      })
      .signers([eol])
      .rpc();
    const rec = await staking.account.stakeAccount.fetch(stakeAccount);
    expect(rec.lockUntil.toNumber()).to.equal(far);

    await expectCode(
      staking.methods
        .unstake(new anchor.BN(1))
        .accounts({
          owner: owner.publicKey,
          config,
          mint,
          vault: vault.publicKey,
          stakeAccount,
          destination: ownerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc(),
      "VoterLock",
    );
  });

  it("notifyLiquidation: stake off, unstake on; repeat is a no-op", async () => {
    await staking.methods
      .notifyLiquidation()
      .accounts({ eolToken: eol.publicKey, config })
      .signers([eol])
      .rpc();
    await staking.methods
      .notifyLiquidation()
      .accounts({ eolToken: eol.publicKey, config })
      .signers([eol])
      .rpc();

    const cfg = await staking.account.stakeConfig.fetch(config);
    expect(cfg.liquidated).to.equal(true);

    await mintTo(connection, factory, mint, ownerAta, factory, 10);
    await expectCode(
      staking.methods
        .stake(new anchor.BN(10))
        .accounts({
          owner: owner.publicKey,
          config,
          mint,
          vault: vault.publicKey,
          source: ownerAta,
          stakeAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc(),
      "Liquidated",
    );

    await staking.methods
      .unstake(new anchor.BN(50_000))
      .accounts({
        owner: other.publicKey,
        config,
        mint,
        vault: vault.publicKey,
        stakeAccount: otherStake,
        destination: otherAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([other])
      .rpc();
    expect((await getAccount(connection, otherAta)).amount).to.equal(50_000n);
  });
});
