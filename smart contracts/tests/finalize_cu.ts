import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { FOUNDER } from "./read-constants";
import { mintAuthorityPda } from "./pda";

const MAX_CU = FOUNDER.MAX_COMPUTE_UNITS;
const ACCOUNT_LIMIT = 64;
const DECIMALS = 9;

describe("finalize compute-budget probe", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const probe = anchor.workspace.Token2022Probe as Program;
  const dex = anchor.workspace.MockDex as Program;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("two swaps + treasury mint fit under 1.4M CU", async () => {
    const mintA = await createMint(connection, payer, payer.publicKey, null, 6);
    const mintB = await createMint(connection, payer, payer.publicKey, null, 9);

    const vaultAKp = Keypair.generate();
    const vaultBKp = Keypair.generate();
    const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from("pool")], dex.programId);

    await dex.methods
      .initialize()
      .accounts({
        payer: payer.publicKey,
        mintA,
        mintB,
        pool: poolPda,
        vaultA: vaultAKp.publicKey,
        vaultB: vaultBKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([vaultAKp, vaultBKp])
      .rpc();

    await mintTo(connection, payer, mintA, vaultAKp.publicKey, payer, 1_000_000_000);
    await mintTo(connection, payer, mintB, vaultBKp.publicKey, payer, 1_000_000_000);

    const userA = await createAccount(connection, payer, mintA, payer.publicKey);
    const userB = await createAccount(connection, payer, mintB, payer.publicKey);
    await mintTo(connection, payer, mintA, userA, payer, 10_000_000);

    const ntMintKp = Keypair.generate();
    const ntMint = ntMintKp.publicKey;
    const [mintAuthority] = mintAuthorityPda(probe.programId, ntMint);

    await probe.methods
      .initNonTransferableMint(DECIMALS)
      .accounts({
        payer: payer.publicKey,
        mint: ntMint,
        mintAuthority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([ntMintKp])
      .rpc();

    const treasury = getAssociatedTokenAddressSync(
      ntMint,
      mintAuthority,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await probe.methods
      .initTreasury()
      .accounts({
        payer: payer.publicKey,
        mint: ntMint,
        mintAuthority,
        treasury,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    let sig = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await connection.getLatestBlockhash("confirmed");
        sig = await probe.methods
          .probeFinalizeCompute(new anchor.BN(1_000_000), new anchor.BN(1))
          .accounts({
            user: payer.publicKey,
            mint: ntMint,
            treasury,
            mintAuthority,
            pool: poolPda,
            vaultA: vaultAKp.publicKey,
            vaultB: vaultBKp.publicKey,
            userTokenA: userA,
            userTokenB: userB,
            dexProgram: dex.programId,
            splTokenProgram: TOKEN_PROGRAM_ID,
            token2022Program: TOKEN_2022_PROGRAM_ID,
          })
          .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: MAX_CU })])
          .rpc({ commitment: "confirmed", skipPreflight: true });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
      }
    }
    const parsed = await connection.getTransaction(sig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const consumed = parsed?.meta?.computeUnitsConsumed ?? 0;
    const message = parsed?.transaction.message as {
      accountKeys?: unknown[];
      staticAccountKeys?: unknown[];
    };
    const accountKeys =
      message?.accountKeys?.length ?? message?.staticAccountKeys?.length ?? 0;
    const report = {
      instruction: "probe_finalize_compute",
      description: "two mock DEX swaps + Token-2022 mint into PDA treasury",
      signature: sig,
      unitsConsumed: consumed,
      limit: MAX_CU,
      headroom: MAX_CU - consumed,
      accountKeys,
      accountLimit: ACCOUNT_LIMIT,
      err: parsed?.meta?.err ?? null,
      logTail: parsed?.meta?.logMessages?.slice(-20) ?? [],
    };

    const outDir = path.join(__dirname, "..", "reports");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "finalize-cu.json"), JSON.stringify(report, null, 2));

    if (parsed?.meta?.err) {
      throw new Error(`finalize probe failed: ${JSON.stringify(parsed.meta.err)}`);
    }
    expect(consumed).to.be.greaterThan(0);
    expect(consumed).to.be.lessThan(MAX_CU);
    expect(accountKeys).to.be.greaterThan(0);
    expect(accountKeys).to.be.lessThan(ACCOUNT_LIMIT);
  });
});
