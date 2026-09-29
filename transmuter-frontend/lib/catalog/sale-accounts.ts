import { PublicKey, SystemProgram } from "@solana/web3.js";
import { eolConfigPda, eolDepositPda } from "@/lib/solana/programs/eol-token";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@/lib/solana/spl-token";

const USDC_DECIMALS = 6;
const USDC_SCALE = BigInt(10) ** BigInt(USDC_DECIMALS);
const AMOUNT = /^\d+(\.\d{1,6})?$/;

export function usdcToAtoms(amount: string): bigint | null {
  const trimmed = amount.trim();
  if (!AMOUNT.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const atoms = BigInt(whole) * USDC_SCALE + BigInt(frac.padEnd(USDC_DECIMALS, "0") || "0");
  return atoms > BigInt(0) ? atoms : null;
}

export function saleAccounts(input: {
  mint: PublicKey;
  depositor: PublicKey;
  usdcMint: PublicKey;
  saleUsdcVault: PublicKey;
}) {
  const config = eolConfigPda(input.mint);
  return {
    depositor: input.depositor,
    config,
    saleUsdcVault: input.saleUsdcVault,
    userUsdc: getAssociatedTokenAddressSync(input.usdcMint, input.depositor, false, TOKEN_PROGRAM_ID),
    deposit: eolDepositPda(config, input.depositor),
    usdcProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}
