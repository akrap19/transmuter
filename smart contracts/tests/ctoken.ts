import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createAssociatedTokenAccountInstruction,
  createInitializeTransferFeeConfigInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
  getMint,
  getMintLen,
  getNonTransferable,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { FOUNDER } from "./read-constants";
import { mintAuthorityPda } from "./pda";

const DECIMALS = 9;
const SCALE = 1_000_000_000n;
const TOKEN_2022_ID = TOKEN_2022_PROGRAM_ID.toBase58();

/** 1.0125 SOL — genesis mint of 1 cSOL at 1.25% premium. */
const GENESIS_DEPOSIT = 1_012_500_000n;
const GENESIS_TOKENS = 1_000_000_000n;
const GENESIS_BACKING = 1_010_000_000n; // base 1 SOL + 1.00% underlying
const GENESIS_REVENUE = 2_500_000n; // 0.25% of base

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

describe("cToken", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const ctoken = anchor.workspace.TransmuterCtoken as Program;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const factory = payer;

  const mintKp = Keypair.generate();
  const protocolKp = Keypair.generate();
  const eolId = Keypair.generate().publicKey;
  const mint = mintKp.publicKey;
  const [mintAuthority] = mintAuthorityPda(ctoken.programId, mint);
  const [config] = pda([Buffer.from("config"), mint.toBuffer()], ctoken.programId);
  const [reserve] = pda([Buffer.from("reserve"), mint.toBuffer()], ctoken.programId);
  const [revenuePot] = pda([Buffer.from("revenue"), mint.toBuffer()], ctoken.programId);
  const [eolRecord] = pda(
    [Buffer.from("eol"), config.toBuffer(), eolId.toBuffer()],
    ctoken.programId,
  );
  const treasury = getAssociatedTokenAddressSync(
    mint,
    factory.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  function mintAccounts() {
    return {
      authority: factory.publicKey,
      config,
      reserve,
      revenuePot,
      mint,
      mintAuthority,
      ctokenTreasury: treasury,
      eolRecord,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
  }

  async function vaultExcess(address: PublicKey): Promise<bigint> {
    const info = await connection.getAccountInfo(address);
    if (!info) return 0n;
    const rent = await connection.getMinimumBalanceForRentExemption(info.data.length);
    return BigInt(info.lamports - rent);
  }

  it("founder premium legs are 125 = 100 + 25 bps", () => {
    expect(FOUNDER.MINT_PREMIUM_RATE_BPS).to.equal(125);
    expect(FOUNDER.UNDERLYING_PREMIUM_RATE_BPS + FOUNDER.PROTOCOL_PREMIUM_RATE_BPS).to.equal(
      FOUNDER.MINT_PREMIUM_RATE_BPS,
    );
  });

  it("initialise NonTransferable cSOL (freeze none, size 170, premium 1.25%)", async () => {
    const fund = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: protocolKp.publicKey,
        lamports: LAMPORTS_PER_SOL / 100,
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
        factory: factory.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKp])
      .rpc();

    const raw = await connection.getAccountInfo(mint);
    expect(raw!.data.length).to.equal(FOUNDER.NON_TRANSFERABLE_MINT_SPACE);
    const mintInfo = await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
    expect(getNonTransferable(mintInfo)).to.not.equal(null);
    expect(mintInfo.freezeAuthority).to.equal(null);
    expect(mintInfo.mintAuthority?.equals(mintAuthority)).to.equal(true);

    const cfg = await ctoken.account.config.fetch(config);
    expect(cfg.mintPremiumBps.toNumber()).to.equal(FOUNDER.MINT_PREMIUM_RATE_BPS);
    expect(cfg.underlyingPremiumBps.toNumber()).to.equal(FOUNDER.UNDERLYING_PREMIUM_RATE_BPS);
    expect(cfg.protocolPremiumBps.toNumber()).to.equal(FOUNDER.PROTOCOL_PREMIUM_RATE_BPS);
  });

  it("factory registers an EOL treasury; a stranger cannot", async () => {
    const createAta = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        treasury,
        factory.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    await sendAndConfirmTransaction(connection, createAta, [payer]);

    await ctoken.methods
      .registerEol(eolId)
      .accounts({
        payer: factory.publicKey,
        factory: factory.publicKey,
        config,
        authority: factory.publicKey,
        ctokenTreasury: treasury,
        eolRecord,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const stranger = Keypair.generate();
    const sig = await connection.requestAirdrop(stranger.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    const [strangerRecord] = pda(
      [Buffer.from("eol"), config.toBuffer(), stranger.publicKey.toBuffer()],
      ctoken.programId,
    );
    try {
      await ctoken.methods
        .registerEol(stranger.publicKey)
        .accounts({
          payer: stranger.publicKey,
          factory: stranger.publicKey,
          config,
          authority: stranger.publicKey,
          ctokenTreasury: treasury,
          eolRecord: strangerRecord,
          systemProgram: SystemProgram.programId,
        })
        .signers([stranger])
        .rpc();
      expect.fail("stranger must not register an EOL");
    } catch (err: unknown) {
      expect(String(err)).to.match(/Constraint|has_one|factory|Error Code/i);
    }
  });

  it("genesis mintForTreasury: 1.0125 SOL mints 1 cSOL; underlying 1% stays unminted; protocol 0.25%", async () => {
    await ctoken.methods
      .mintForTreasury(new anchor.BN(GENESIS_DEPOSIT.toString()))
      .accounts(mintAccounts())
      .rpc();

    const acc = await getAccount(connection, treasury, undefined, TOKEN_2022_PROGRAM_ID);
    expect(acc.amount).to.equal(GENESIS_TOKENS);
    expect(await vaultExcess(reserve)).to.equal(GENESIS_BACKING);
    expect(await vaultExcess(revenuePot)).to.equal(GENESIS_REVENUE);
  });

  it("backing-per-token rises after mint (underlying premium is a bare deposit)", async () => {
    const supply = (await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID)).supply;
    const backing = await vaultExcess(reserve);
    expect(supply).to.equal(GENESIS_TOKENS);
    expect(backing * SCALE / supply).to.equal(1_010_000_000n);
  });

  it("dust deposit reverts (tokensToMint == 0)", async () => {
    try {
      await ctoken.methods
        .mintForTreasury(new anchor.BN(1))
        .accounts(mintAccounts())
        .rpc();
      expect.fail("dust mint must revert");
    } catch (err: unknown) {
      expect(String(err)).to.match(/Dust|Error Code/i);
    }
  });

  it("unregistered caller cannot mintForTreasury", async () => {
    const stranger = Keypair.generate();
    const sig = await connection.requestAirdrop(stranger.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    try {
      await ctoken.methods
        .mintForTreasury(new anchor.BN(GENESIS_DEPOSIT.toString()))
        .accounts({
          ...mintAccounts(),
          authority: stranger.publicKey,
        })
        .signers([stranger])
        .rpc();
      expect.fail("unregistered mint must revert");
    } catch (err: unknown) {
      expect(String(err)).to.match(/Constraint|authority|eol|Error Code/i);
    }
  });

  it("cToken transfer fails at Token-2022", async () => {
    const destOwner = Keypair.generate();
    const destAta = getAssociatedTokenAddressSync(
      mint,
      destOwner.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destAta,
        destOwner.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    await sendAndConfirmTransaction(connection, tx, [payer]);

    const xfer = new Transaction().add(
      createTransferCheckedInstruction(
        treasury,
        mint,
        destAta,
        factory.publicKey,
        1,
        DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    try {
      await sendAndConfirmTransaction(connection, xfer, [payer]);
      expect.fail("NonTransferable transfer should fail");
    } catch (err: unknown) {
      expect(String(err)).to.include(TOKEN_2022_ID);
      expect(String(err)).to.match(/custom program error/i);
    }
  });

  it("TransferFeeConfig cannot be added to the 170-byte mint", async () => {
    expect(getMintLen([ExtensionType.NonTransferable, ExtensionType.TransferFeeConfig])).to.be
      .greaterThan(FOUNDER.NON_TRANSFERABLE_MINT_SPACE);
    const ix = createInitializeTransferFeeConfigInstruction(
      mint,
      payer.publicKey,
      payer.publicKey,
      50,
      BigInt("18446744073709551615"),
      TOKEN_2022_PROGRAM_ID,
    );
    try {
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
      expect.fail("TransferFeeConfig should fail");
    } catch (err: unknown) {
      expect(String(err)).to.include(TOKEN_2022_ID);
    }
  });

  it("flush sends only protocol revenue, never reserve backing", async () => {
    const beforeReserve = await vaultExcess(reserve);
    const beforeProto = BigInt(
      (await connection.getAccountInfo(protocolKp.publicKey))!.lamports,
    );
    await ctoken.methods
      .flushProtocolRevenue()
      .accounts({
        config,
        revenuePot,
        protocolRevenueWallet: protocolKp.publicKey,
      })
      .rpc();
    expect(await vaultExcess(revenuePot)).to.equal(0n);
    expect(await vaultExcess(reserve)).to.equal(beforeReserve);
    const afterProto = BigInt(
      (await connection.getAccountInfo(protocolKp.publicKey))!.lamports,
    );
    expect(afterProto - beforeProto).to.equal(GENESIS_REVENUE);
  });

  it("redeem is fee-free, never closes, and backing-per-token does not fall", async () => {
    const bptBefore = (await vaultExcess(reserve)) * SCALE / GENESIS_TOKENS;
    const solBefore = BigInt(await connection.getBalance(factory.publicKey));
    await ctoken.methods
      .redeem(new anchor.BN(GENESIS_TOKENS.toString()))
      .accounts({
        authority: factory.publicKey,
        config,
        reserve,
        mint,
        mintAuthority,
        ctokenTreasury: treasury,
        eolRecord,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const acc = await getAccount(connection, treasury, undefined, TOKEN_2022_PROGRAM_ID);
    expect(acc.amount).to.equal(0n);
    const mintInfo = await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
    expect(mintInfo.supply).to.equal(0n);
    expect(mintInfo.isInitialized).to.equal(true);
    expect(await vaultExcess(reserve)).to.equal(0n);
    const solAfter = BigInt(await connection.getBalance(factory.publicKey));
    const net = solAfter - solBefore;
    // Payout is 1.01 SOL; the wallet also pays the tx fee, so the net gain is just under GENESIS_BACKING.
    expect(net > GENESIS_BACKING - 100_000n).to.equal(true);
    expect(net <= GENESIS_BACKING).to.equal(true);
    expect(bptBefore).to.equal(1_010_000_000n);
  });

  it("no instruction sends reserve SOL to the protocol wallet", async () => {
    await ctoken.methods
      .mintForTreasury(new anchor.BN(GENESIS_DEPOSIT.toString()))
      .accounts(mintAccounts())
      .rpc();
    const backing = await vaultExcess(reserve);
    expect(backing).to.equal(GENESIS_BACKING);
    try {
      await ctoken.methods
        .flushProtocolRevenue()
        .accounts({
          config,
          revenuePot,
          protocolRevenueWallet: reserve,
        })
        .rpc();
      expect.fail("flush must not target the reserve");
    } catch (err: unknown) {
      expect(String(err)).to.match(/Constraint|has_one|protocol|Error Code|owned by/i);
    }
    expect(await vaultExcess(reserve)).to.equal(backing);
  });
});
