import type { LaunchStatus } from "./types";

export type PostSaleKind =
  | "finalize"
  | "convertTreasury"
  | "seedRaydiumUsdc"
  | "seedRaydiumWsol"
  | "claimTokens";

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
  salePrice: bigint;
  decimals: number;
};

/**
 * Permissionless. The program does not require the creator.
 *
 * The order is the order the jobs must run in: `convert_treasury` unwraps and
 * closes the config WSOL account, so it has to come after both pool seeds or it
 * swallows the WSOL that belongs in the EOL/SOL pool.
 */
export function postSaleOffers(input: PostSaleInput): PostSaleKind[] {
  const offers: PostSaleKind[] = [];
  if (canFinalize(input)) offers.push("finalize");
  if (input.status === "active") {
    const seed = raydiumSeedAmounts(input);
    if (seed.usdc.token > BigInt(0) && seed.usdc.quote > BigInt(0)) offers.push("seedRaydiumUsdc");
    if (seed.wsol.token > BigInt(0) && seed.wsol.quote > BigInt(0)) offers.push("seedRaydiumWsol");
    if (!input.convertDone) offers.push("convertTreasury");
  }
  if (input.status === "active" && !input.claimed && input.depositAtoms > BigInt(0)) offers.push("claimTokens");
  return offers;
}

/** Jobs left after finalize that any wallet can finish in one approval. A claim is per buyer and stays separate. */
export function setupSteps(offers: PostSaleKind[]): PostSaleKind[] {
  return offers.filter((kind) => kind !== "finalize" && kind !== "claimTokens");
}

/** Button text while a batch signs and lands: "Signing…" until the first transaction confirms, then a step count. */
export function batchProgressLabel(progress: { done: number; total: number } | null): string {
  if (!progress || progress.done === 0) return "Signing…";
  if (progress.done >= progress.total) return "Finishing…";
  return `Confirming ${progress.done + 1} of ${progress.total}…`;
}

/**
 * The USDC leg is seeded first, so while it is still pending it takes its share
 * of the LP vault. Once it is gone the SOL leg owns whatever the vault still holds.
 */
export function raydiumSeedAmounts(
  input: Pick<PostSaleInput, "lpTokenAtoms" | "saleUsdcAtoms" | "wsolAtoms" | "lpUsdcShareBps">,
): RaydiumSeed {
  const usdcPending = input.saleUsdcAtoms > BigInt(0);
  const usdcToken = usdcPending ? (input.lpTokenAtoms * BigInt(input.lpUsdcShareBps)) / BigInt(10_000) : BigInt(0);
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
  return input.now >= input.saleEnd || saleSoldOut(input);
}

/** Matches on-chain `sale_sold_out`: a remainder smaller than one USDC atom is sold out. */
function saleSoldOut(input: PostSaleInput): boolean {
  if (input.soldTokens >= input.saleTokens) return input.soldTokens === input.saleTokens;
  const remaining = input.saleTokens - input.soldTokens;
  const step = tokensForOneAtom(input.salePrice, input.decimals);
  return step == null || step > remaining;
}

function tokensForOneAtom(salePrice: bigint, decimals: number): bigint | null {
  if (salePrice <= BigInt(0)) return null;
  const tokens = BigInt(10) ** BigInt(decimals) / salePrice;
  return tokens > BigInt(0) ? tokens : null;
}
