import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  createAssociatedTokenAccountInstruction,
  createInitializeTransferFeeConfigInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
  getMint,
  getMintLen,
  getNonTransferable,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { FOUNDER } from "./read-constants";
import { mintAuthorityPda } from "./pda";

const DECIMALS = 9;
const MINT_AMOUNT = 1_000_000_000; // 1 token
const TOKEN_2022_ID = TOKEN_2022_PROGRAM_ID.toBase58();

describe("token-2022 NonTransferable / PDA mint-burn", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const probe = anchor.workspace.Token2022Probe as Program;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  const mintKp = Keypair.generate();
  let mint: PublicKey;
  let mintAuthority: PublicKey;
  let treasury: PublicKey;

  it("getMintLen(NonTransferable) is exactly 170", () => {
    expect(getMintLen([ExtensionType.NonTransferable])).to.equal(
      FOUNDER.NON_TRANSFERABLE_MINT_SPACE,
    );
  });

  it("initialises a NonTransferable Token-2022 mint (freeze authority none, size 170)", async () => {
    mint = mintKp.publicKey;
    [mintAuthority] = mintAuthorityPda(probe.programId, mint);

    await probe.methods
      .initNonTransferableMint(DECIMALS)
      .accounts({
        payer: payer.publicKey,
        mint,
        mintAuthority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([mintKp])
      .rpc();

    const raw = await connection.getAccountInfo(mint);
    expect(raw).to.not.equal(null);
    expect(raw!.data.length).to.equal(FOUNDER.NON_TRANSFERABLE_MINT_SPACE);

    const mintInfo = await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
    expect(getNonTransferable(mintInfo)).to.not.equal(null);
    expect(mintInfo.decimals).to.equal(DECIMALS);
    expect(mintInfo.mintAuthority?.equals(mintAuthority)).to.equal(true);
    expect(mintInfo.freezeAuthority).to.equal(null);
  });

  it("creates a PDA-owned treasury ATA under that mint", async () => {
    treasury = getAssociatedTokenAddressSync(
      mint,
      mintAuthority,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await probe.methods
      .initTreasury()
      .accounts({
        payer: payer.publicKey,
        mint,
        mintAuthority,
        treasury,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const acc = await getAccount(connection, treasury, undefined, TOKEN_2022_PROGRAM_ID);
    expect(acc.owner.equals(mintAuthority)).to.equal(true);
    expect(acc.mint.equals(mint)).to.equal(true);
  });

  it("MintTo succeeds into the PDA-owned treasury", async () => {
    await probe.methods
      .mintToTreasury(new anchor.BN(MINT_AMOUNT))
      .accounts({
        mint,
        treasury,
        mintAuthority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    const acc = await getAccount(connection, treasury, undefined, TOKEN_2022_PROGRAM_ID);
    expect(acc.amount).to.equal(BigInt(MINT_AMOUNT));
  });

  it("raw Transfer fails at Token-2022, not protocol logic", async () => {
    const destOwner = Keypair.generate();
    const destAta = getAssociatedTokenAddressSync(
      mint,
      destOwner.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const createDest = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destAta,
        destOwner.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    await sendAndConfirmTransaction(connection, createDest, [payer]);

    try {
      await probe.methods
        .tryTransferFromTreasury(new anchor.BN(1), DECIMALS)
        .accounts({
          mint,
          treasury,
          destination: destAta,
          mintAuthority,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      expect.fail("NonTransferable transfer should fail");
    } catch (err: unknown) {
      const msg = String(err);
      expect(msg).to.include(TOKEN_2022_ID);
      expect(msg).to.match(/custom program error/i);
      expect(msg).to.not.match(/Error Code:/);
    }
  });

  it("Burn succeeds from the PDA-owned treasury", async () => {
    await probe.methods
      .burnFromTreasury(new anchor.BN(MINT_AMOUNT / 2))
      .accounts({
        mint,
        treasury,
        mintAuthority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    const acc = await getAccount(connection, treasury, undefined, TOKEN_2022_PROGRAM_ID);
    expect(acc.amount).to.equal(BigInt(MINT_AMOUNT / 2));
  });

  it("cToken mint size cannot hold TransferFeeConfig", () => {
    const both = getMintLen([
      ExtensionType.NonTransferable,
      ExtensionType.TransferFeeConfig,
    ]);
    expect(both).to.be.greaterThan(FOUNDER.NON_TRANSFERABLE_MINT_SPACE);
  });

  it("TransferFeeConfig cannot be initialised on the 170-byte NonTransferable mint", async () => {
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
      expect.fail("TransferFeeConfig on the 170-byte NonTransferable mint should fail");
    } catch (err: unknown) {
      const msg = String(err);
      expect(msg).to.include(TOKEN_2022_ID);
      expect(msg).to.not.match(/token2022_probe/i);
    }
    const raw = await connection.getAccountInfo(mint);
    expect(raw!.data.length).to.equal(FOUNDER.NON_TRANSFERABLE_MINT_SPACE);
    const mintState = await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
    expect(getNonTransferable(mintState)).to.not.equal(null);
  });
});
