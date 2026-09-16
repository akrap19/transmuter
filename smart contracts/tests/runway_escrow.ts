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

const SCHEDULE_NONE = 0;
const PRINCIPAL = 1_000_000;
const ADVANCE = 250_000;

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

describe("runway escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const escrow = anchor.workspace.TransmuterRunwayEscrow as Program;
  const connection = provider.connection;
  const factory = (provider.wallet as anchor.Wallet).payer;

  const eol = Keypair.generate();
  const team = Keypair.generate();
  const dao = Keypair.generate();
  const stranger = Keypair.generate();
  const vault = Keypair.generate();
  const registry = Keypair.generate();

  let usdc: PublicKey;
  let config: PublicKey;
  let source: PublicKey;
  let teamAta: PublicKey;
  let treasury: PublicKey;

  async function fund(kp: Keypair) {
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  it("has no returnToTreasury instruction", () => {
    expect(Object.keys(escrow.methods)).to.not.include("returnToTreasury");
    expect(Object.keys(escrow.methods)).to.include("notifyLiquidation");
    expect(Object.keys(escrow.methods)).to.include("halt");
    expect(Object.keys(escrow.methods)).to.include("resume");
    expect(Object.keys(escrow.methods)).to.include("advance");
  });

  it("initialise, stamp, fund by balance-delta, then draw the released principal", async () => {
    await Promise.all([eol, team, dao, stranger].map(fund));
    usdc = await createMint(connection, factory, factory.publicKey, null, 6);
    [config] = pda(
      [Buffer.from("config"), eol.publicKey.toBuffer(), usdc.toBuffer()],
      escrow.programId,
    );

    await escrow.methods
      .initialize(SCHEDULE_NONE)
      .accounts({
        payer: factory.publicKey,
        factory: factory.publicKey,
        eolToken: eol.publicKey,
        usdcMint: usdc,
        teamRecipient: team.publicKey,
        daoDirect: dao.publicKey,
        registry: registry.publicKey,
        config,
        vault: vault.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([vault])
      .rpc();

    const slot = await connection.getSlot();
    const now = (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);
    await escrow.methods
      .stampStartTime(new anchor.BN(now - 60))
      .accounts({ eolToken: eol.publicKey, config })
      .signers([eol])
      .rpc();

    source = await createAssociatedTokenAccount(connection, factory, usdc, eol.publicKey);
    await mintTo(connection, factory, usdc, source, factory, PRINCIPAL);

    await escrow.methods
      .fund(new anchor.BN(PRINCIPAL))
      .accounts({
        eolToken: eol.publicKey,
        config,
        vault: vault.publicKey,
        source,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol])
      .rpc();
    expect((await getAccount(connection, vault.publicKey)).amount).to.equal(BigInt(PRINCIPAL));

    await expectCode(
      escrow.methods
        .fund(new anchor.BN(1))
        .accounts({
          eolToken: eol.publicKey,
          config,
          vault: vault.publicKey,
          source,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([eol])
        .rpc(),
      "AlreadyFunded",
    );

    teamAta = await createAssociatedTokenAccount(connection, factory, usdc, team.publicKey);
    await escrow.methods
      .draw()
      .accounts({
        teamRecipient: team.publicKey,
        config,
        vault: vault.publicKey,
        destination: teamAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([team])
      .rpc();
    expect((await getAccount(connection, teamAta)).amount).to.equal(BigInt(PRINCIPAL));
    expect((await getAccount(connection, vault.publicKey)).amount).to.equal(0n);
  });

  it("halt/resume: EOL or DAO-direct; advance is EOL only; halt blocks draws", async () => {
    const eol2 = Keypair.generate();
    const team2 = Keypair.generate();
    const dao2 = Keypair.generate();
    const vault2 = Keypair.generate();
    await Promise.all([eol2, team2, dao2, stranger].map(fund));
    const usdc2 = await createMint(connection, factory, factory.publicKey, null, 6);
    const [config2] = pda(
      [Buffer.from("config"), eol2.publicKey.toBuffer(), usdc2.toBuffer()],
      escrow.programId,
    );
    await escrow.methods
      .initialize(SCHEDULE_NONE)
      .accounts({
        payer: factory.publicKey,
        factory: factory.publicKey,
        eolToken: eol2.publicKey,
        usdcMint: usdc2,
        teamRecipient: team2.publicKey,
        daoDirect: dao2.publicKey,
        registry: registry.publicKey,
        config: config2,
        vault: vault2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([vault2])
      .rpc();

    const slot = await connection.getSlot();
    const now = (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);
    await escrow.methods
      .stampStartTime(new anchor.BN(now - 60))
      .accounts({ eolToken: eol2.publicKey, config: config2 })
      .signers([eol2])
      .rpc();

    const src = await createAssociatedTokenAccount(connection, factory, usdc2, eol2.publicKey);
    await mintTo(connection, factory, usdc2, src, factory, PRINCIPAL);
    await escrow.methods
      .fund(new anchor.BN(PRINCIPAL))
      .accounts({
        eolToken: eol2.publicKey,
        config: config2,
        vault: vault2.publicKey,
        source: src,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol2])
      .rpc();

    await expectCode(
      escrow.methods.halt().accounts({ authority: stranger.publicKey, config: config2 }).signers([stranger]).rpc(),
      "Unauthorized",
    );

    await escrow.methods.halt().accounts({ authority: dao2.publicKey, config: config2 }).signers([dao2]).rpc();
    const dest = await createAssociatedTokenAccount(connection, factory, usdc2, team2.publicKey);
    await expectCode(
      escrow.methods
        .draw()
        .accounts({
          teamRecipient: team2.publicKey,
          config: config2,
          vault: vault2.publicKey,
          destination: dest,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([team2])
        .rpc(),
      "NotActive",
    );

    await escrow.methods.resume().accounts({ authority: eol2.publicKey, config: config2 }).signers([eol2]).rpc();

    await expectCode(
      escrow.methods
        .advance(new anchor.BN(ADVANCE))
        .accounts({ eolToken: dao2.publicKey, config: config2 })
        .signers([dao2])
        .rpc(),
      "ConstraintHasOne",
    );

    await escrow.methods
      .advance(new anchor.BN(ADVANCE))
      .accounts({ eolToken: eol2.publicKey, config: config2 })
      .signers([eol2])
      .rpc();

    await escrow.methods
      .draw()
      .accounts({
        teamRecipient: team2.publicKey,
        config: config2,
        vault: vault2.publicKey,
        destination: dest,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([team2])
      .rpc();
    expect((await getAccount(connection, dest)).amount).to.equal(BigInt(PRINCIPAL));
  });

  it("notifyLiquidation is the only non-draw outflow and sends the remainder to the EOL treasury", async () => {
    const eol3 = Keypair.generate();
    const team3 = Keypair.generate();
    const vault3 = Keypair.generate();
    await Promise.all([eol3, team3].map(fund));
    const usdc3 = await createMint(connection, factory, factory.publicKey, null, 6);
    const [config3] = pda(
      [Buffer.from("config"), eol3.publicKey.toBuffer(), usdc3.toBuffer()],
      escrow.programId,
    );
    await escrow.methods
      .initialize(SCHEDULE_NONE)
      .accounts({
        payer: factory.publicKey,
        factory: factory.publicKey,
        eolToken: eol3.publicKey,
        usdcMint: usdc3,
        teamRecipient: team3.publicKey,
        daoDirect: dao.publicKey,
        registry: registry.publicKey,
        config: config3,
        vault: vault3.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([vault3])
      .rpc();

    const slot = await connection.getSlot();
    const now = (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);
    await escrow.methods
      .stampStartTime(new anchor.BN(now - 1))
      .accounts({ eolToken: eol3.publicKey, config: config3 })
      .signers([eol3])
      .rpc();

    const src = await createAssociatedTokenAccount(connection, factory, usdc3, eol3.publicKey);
    await mintTo(connection, factory, usdc3, src, factory, PRINCIPAL);
    await escrow.methods
      .fund(new anchor.BN(PRINCIPAL))
      .accounts({
        eolToken: eol3.publicKey,
        config: config3,
        vault: vault3.publicKey,
        source: src,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol3])
      .rpc();

    treasury = await createAssociatedTokenAccount(connection, factory, usdc3, factory.publicKey);
    await escrow.methods
      .notifyLiquidation()
      .accounts({
        eolToken: eol3.publicKey,
        config: config3,
        vault: vault3.publicKey,
        eolTreasury: treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol3])
      .rpc();

    expect((await getAccount(connection, vault3.publicKey)).amount).to.equal(0n);
    expect((await getAccount(connection, treasury)).amount).to.equal(BigInt(PRINCIPAL));

    await escrow.methods
      .notifyLiquidation()
      .accounts({
        eolToken: eol3.publicKey,
        config: config3,
        vault: vault3.publicKey,
        eolTreasury: treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([eol3])
      .rpc();
    expect((await getAccount(connection, treasury)).amount).to.equal(BigInt(PRINCIPAL));
  });
});
