import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { eolConfigPda, eolDepositPda } from "@/lib/solana/programs/eol-token";
import { saleAccounts, usdcAtomsToInput, usdcToAtoms } from "./sale-accounts";

const mint = Keypair.generate().publicKey;
const depositor = Keypair.generate().publicKey;
const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const saleUsdcVault = Keypair.generate().publicKey;

describe("usdcToAtoms", () => {
  it("converts a USDC decimal into 6-decimal atoms", () => {
    expect(usdcToAtoms("250")).toBe(BigInt(250_000_000));
    expect(usdcToAtoms("1.25")).toBe(BigInt(1_250_000));
    expect(usdcToAtoms("0.000001")).toBe(BigInt(1));
  });

  it("round-trips a cap that is a few atoms under a whole dollar", () => {
    expect(usdcToAtoms(usdcAtomsToInput(BigInt(4_999_988)))).toBe(BigInt(4_999_988));
    expect(usdcAtomsToInput(BigInt(5_000_000))).toBe("5");
  });

  it("rejects zero, extra precision, and non-numeric input", () => {
    expect(usdcToAtoms("0")).toBeNull();
    expect(usdcToAtoms("1.0000001")).toBeNull();
    expect(usdcToAtoms("")).toBeNull();
    expect(usdcToAtoms("abc")).toBeNull();
  });
});

describe("saleAccounts", () => {
  it("points deposit and withdraw at the wallet USDC ATA and the sale vault", () => {
    const config = eolConfigPda(mint);
    const accounts = saleAccounts({ mint, depositor, usdcMint, saleUsdcVault });

    expect(accounts.depositor).toBe(depositor);
    expect(accounts.config.equals(config)).toBe(true);
    expect(accounts.saleUsdcVault).toBe(saleUsdcVault);
    expect(accounts.userUsdc.equals(getAssociatedTokenAddressSync(usdcMint, depositor, false, TOKEN_PROGRAM_ID))).toBe(true);
    expect(accounts.deposit.equals(eolDepositPda(config, depositor))).toBe(true);
    expect(accounts.usdcProgram.equals(TOKEN_PROGRAM_ID)).toBe(true);
    expect(accounts.systemProgram.equals(SystemProgram.programId)).toBe(true);
  });
});
