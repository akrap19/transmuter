import type { LaunchStatus } from "./types";

export type PostSaleKind = "finalize" | "convertTreasury" | "seedRaydiumUsdc" | "seedRaydiumWsol" | "claimTokens";

export type RaydiumSeed = {
  usdc: { token: bigint; quote: bigint };
  wsol: { token: bigint; quote: bigint };
};

export type PostSaleInput = {
  status: LaunchStatus;
  now: number;
  saleEnd: number;
  soldTokens: bigint;
  saleTokens: bigint;
  convertDone: boolean;
  claimed: boolean;
  depositAtoms: bigint;
  lpTokenAtoms: bigint;
  saleUsdcAtoms: bigint;
  wsolAtoms: bigint;
  lpUsdcShareBps: number;
};

/** Permissionless. The program does not require the creator. */
export function postSaleOffers(input: PostSaleInput): PostSaleKind[] {
  const offers: PostSaleKind[] = [];
  if (canFinalize(input)) offers.push("finalize");
  if (input.status === "active" && !input.convertDone) offers.push("convertTreasury");
  if (input.status === "active") {
    const seed = raydiumSeedAmounts(input);
    if (seed.usdc.token > BigInt(0) && seed.usdc.quote > BigInt(0)) offers.push("seedRaydiumUsdc");
    if (seed.wsol.token > BigInt(0) && seed.wsol.quote > BigInt(0)) offers.push("seedRaydiumWsol");
  }
  if (input.status === "active" && !input.claimed && input.depositAtoms > BigInt(0)) offers.push("claimTokens");
  return offers;
}

export function raydiumSeedAmounts(
  input: Pick<PostSaleInput, "lpTokenAtoms" | "saleUsdcAtoms" | "wsolAtoms" | "lpUsdcShareBps">,
): RaydiumSeed {
  const usdcToken = (input.lpTokenAtoms * BigInt(input.lpUsdcShareBps)) / BigInt(10_000);
  return {
    usdc: { token: usdcToken, quote: input.saleUsdcAtoms },
    wsol: { token: input.lpTokenAtoms - usdcToken, quote: input.wsolAtoms },
  };
}

export function postSaleNote(status: LaunchStatus, offers: PostSaleKind[]): string | null {
  if (offers.includes("finalize")) return "Any wallet can crank finalize. The creator is not required.";
  if (status === "sale") return "Finalize opens when the sale window ends or the allocation sells out. Any wallet can crank it.";
  return null;
}

function canFinalize(input: PostSaleInput): boolean {
  if (input.status !== "sale") return false;
  const soldOut = input.saleTokens > BigInt(0) && input.soldTokens === input.saleTokens;
  return input.now >= input.saleEnd || soldOut;
}
