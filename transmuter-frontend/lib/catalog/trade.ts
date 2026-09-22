import type { LaunchStatus, TradePool } from "./types";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export function tradeAvailable(status: LaunchStatus) {
  return status === "active" || status === "liquidating";
}

export function dexSwapUrl(inputMint: string, outputMint: string) {
  return `https://jup.ag/swap/${inputMint}-${outputMint}`;
}

export function tradePools(mint: string, usdcPool: string, solPool: string): TradePool[] {
  return [
    { label: "EOL/USDC", pool: usdcPool, href: dexSwapUrl(USDC_MINT, mint) },
    { label: "EOL/SOL", pool: solPool, href: dexSwapUrl(SOL_MINT, mint) },
  ];
}
