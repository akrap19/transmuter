import { getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { raydiumPoolKeys } from "@/lib/solana/raydium-cpmm";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { prepareWireStep, type WireLaunch } from "./wire-accounts";
import { WIRE_DAO, WIRE_EOL, WIRE_ESCROW, WIRE_POOL_SOL, WIRE_POOL_USDC, WIRE_REGISTER, WIRE_STAKING, WIRE_VAULTS, WIRE_VESTING } from "./wire-plan";

const BASE = WIRE_EOL | WIRE_STAKING | WIRE_REGISTER | WIRE_DAO | WIRE_POOL_USDC | WIRE_POOL_SOL | WIRE_VAULTS;

function fromFill(fill: number): Keypair {
  return Keypair.fromSeed(new Uint8Array(32).fill(fill));
}

function pda(program: string, ...seeds: Array<Buffer | Uint8Array>): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, new PublicKey(program))[0];
}

function launch(requiredMask = BASE): { launch: WireLaunch; mint: Keypair } {
  const mint = fromFill(2);
  return {
    mint,
    launch: {
      launchId: 9,
      mint: mint.publicKey,
      backingCtoken: fromFill(3).publicKey,
      teamRecipient: fromFill(4).publicKey,
      requiredMask,
      cranker: fromFill(1).publicKey,
      usdcMint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
      protocolRevenueWallet: fromFill(5).publicKey,
      registry: new PublicKey(PROGRAM_IDS.registry),
      dao: new PublicKey(PROGRAM_IDS.dao),
    },
  };
}

describe("prepareWireStep", () => {
  it("builds wireEol with the saved mint signer and SystemProgram stand-ins when vesting and escrow are unused", () => {
    const { launch: row, mint } = launch();
    const step = prepareWireStep("eol", row, { mintSigner: mint });
    const eolConfig = pda(PROGRAM_IDS.eolToken, Buffer.from("config"), mint.publicKey.toBuffer());

    expect(step.method).toBe("wireEol");
    expect(step.signers.map((signer) => signer.publicKey.toBase58())).toEqual([mint.publicKey.toBase58()]);
    expect(step.accounts.eolConfig.equals(eolConfig)).toBe(true);
    expect(step.accounts.mintAuthority.equals(pda(PROGRAM_IDS.eolToken, Buffer.from("mint_authority"), mint.publicKey.toBuffer()))).toBe(true);
    expect(step.accounts.stakingConfig.equals(pda(PROGRAM_IDS.staking, Buffer.from("config"), mint.publicKey.toBuffer()))).toBe(true);
    expect(step.accounts.vestingConfig.equals(SystemProgram.programId)).toBe(true);
    expect(step.accounts.escrowConfig.equals(SystemProgram.programId)).toBe(true);
    expect(step.accounts.ctokenMint.equals(row.backingCtoken)).toBe(true);
    expect(
      step.accounts.ctokenTreasury.equals(
        getAssociatedTokenAddressSync(row.backingCtoken, eolConfig, true, TOKEN_2022_PROGRAM_ID),
      ),
    ).toBe(true);
  });

  it("uses vesting and escrow PDAs on wireEol when the launch requires them", () => {
    const { launch: row, mint } = launch(BASE | WIRE_VESTING | WIRE_ESCROW);
    const step = prepareWireStep("eol", row, { mintSigner: mint });
    const eolConfig = pda(PROGRAM_IDS.eolToken, Buffer.from("config"), mint.publicKey.toBuffer());

    expect(step.accounts.vestingConfig.equals(pda(PROGRAM_IDS.vesting, Buffer.from("config"), mint.publicKey.toBuffer()))).toBe(true);
    expect(
      step.accounts.escrowConfig.equals(
        pda(PROGRAM_IDS.runwayEscrow, Buffer.from("config"), eolConfig.toBuffer(), row.usdcMint.toBuffer()),
      ),
    ).toBe(true);
  });

  it("refuses wireEol when the mint secret is gone", () => {
    const { launch: row } = launch();
    expect(() => prepareWireStep("eol", row, {})).toThrow(/mint keypair/i);
  });

  it("assigns a fresh signer to each vault the crank must create", () => {
    const { launch: row, mint } = launch(BASE | WIRE_VESTING | WIRE_ESCROW);
    const generated = Array.from({ length: 13 }, (_, index) => fromFill(10 + index));
    let cursor = 0;
    const generateKeypair = () => generated[cursor++];
    const options = { mintSigner: mint, generateKeypair };

    const staking = prepareWireStep("staking", row, options);
    expect(staking.method).toBe("wireStaking");
    expect(staking.signers).toEqual([generated[0]]);

    const vesting = prepareWireStep("vesting", row, options);
    expect(vesting.method).toBe("wireVesting");
    expect(vesting.signers).toEqual([generated[1], generated[2]]);
    expect(vesting.accounts.founder.equals(row.cranker)).toBe(true);
    expect(vesting.accounts.teamRecipient.equals(row.teamRecipient)).toBe(true);
    expect(
      vesting.accounts.teamEntry.equals(
        pda(
          PROGRAM_IDS.vesting,
          Buffer.from("entry"),
          vesting.accounts.vestingConfig.toBuffer(),
          row.teamRecipient.toBuffer(),
        ),
      ),
    ).toBe(true);

    const escrow = prepareWireStep("escrow", row, options);
    expect(escrow.method).toBe("wireEscrow");
    expect(escrow.accounts.tokenProgram.equals(TOKEN_PROGRAM_ID)).toBe(true);
    expect(escrow.accounts.dao.equals(row.dao)).toBe(true);
    expect(escrow.signers).toEqual([generated[3]]);

    const raydiumPool = raydiumPoolKeys(row.usdcMint, NATIVE_MINT).poolState;
    const usdcPool = prepareWireStep("poolUsdc", row, options);
    expect(usdcPool.method).toBe("wireRaydiumPools");
    expect(usdcPool.accounts.pool.equals(raydiumPool)).toBe(true);
    expect(usdcPool.signers).toEqual([]);

    const solPool = prepareWireStep("poolSol", row, options);
    expect(solPool.method).toBe("wireRaydiumPools");
    expect(solPool.accounts.pool.equals(raydiumPool)).toBe(true);
    expect(solPool.signers).toEqual([]);

    const vaults = prepareWireStep("vaults", row, options);
    expect(vaults.method).toBe("wireVaults");
    expect(vaults.signers).toEqual(generated.slice(4, 10));
    expect(vaults.accounts.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(vaults.accounts.usdcProgram.equals(TOKEN_PROGRAM_ID)).toBe(true);
  });

  it("creates the cToken treasury ATA before register, and register names the eol record PDA", () => {
    const { launch: row, mint } = launch();
    const eolConfig = pda(PROGRAM_IDS.eolToken, Buffer.from("config"), mint.publicKey.toBuffer());
    const ctokenConfig = pda(PROGRAM_IDS.ctoken, Buffer.from("config"), row.backingCtoken.toBuffer());

    const ata = prepareWireStep("treasuryAta", row, { mintSigner: mint });
    expect(ata.kind).toBe("ata");
    expect(ata.signers).toEqual([]);
    expect(ata.accounts.ata.equals(getAssociatedTokenAddressSync(row.backingCtoken, eolConfig, true, TOKEN_2022_PROGRAM_ID))).toBe(true);
    expect(ata.accounts.owner.equals(eolConfig)).toBe(true);

    const register = prepareWireStep("register", row, { mintSigner: mint });
    expect(register.method).toBe("wireRegister");
    expect(register.accounts.ctokenConfig.equals(ctokenConfig)).toBe(true);
    expect(
      register.accounts.eolRecord.equals(
        pda(PROGRAM_IDS.ctoken, Buffer.from("eol"), ctokenConfig.toBuffer(), row.mint.toBuffer()),
      ),
    ).toBe(true);

    const dao = prepareWireStep("dao", row, { mintSigner: mint });
    expect(dao.method).toBe("wireDao");
    expect(Object.keys(dao.accounts).sort()).toEqual(["cranker", "factory", "launch"]);
    expect(dao.signers).toEqual([]);
  });
});
