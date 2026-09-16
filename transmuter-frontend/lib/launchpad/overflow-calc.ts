import { formatMcap, formatPrice, solveFromState } from "./launch-solver";
import type { LaunchSolveResult } from "./types";

export type OverflowProjection = {
  basis: string;
  listPrice: string;
  backing: string;
  mcp: string;
  foregoPct: number;
};

export function getForegoPct(overflowForego: number): number {
  return (75 + overflowForego / 4) / 100;
}

export function computeOverflowProjection(
  state: {
    tokenSupply: string;
    escrowNeed: string;
    allocLP: number;
    allocPublic: number;
    targetRaise: string;
    overflowCap: string;
    overflowForego: number;
  },
  L: LaunchSolveResult | null,
): OverflowProjection | null {
  if (!L || !L.feasible || !L.R || !L.supply || !L.lpTokens || !L.lpFrac || !L.treasFrac || !L.escrowFrac) {
    return null;
  }

  const capRaw = parseFloat(state.overflowCap);
  const base = L.R;
  const capped = capRaw && !isNaN(capRaw) && capRaw >= base;
  const R = capped ? capRaw : base;

  const surplus = Math.max(0, R - base);
  const lpCash = L.lpFrac * R;
  let treasCash = L.treasFrac * R;
  const escrowSurplus = L.escrowFrac * surplus;
  const foregoPct = getForegoPct(state.overflowForego);
  const redirected = foregoPct * escrowSurplus;
  treasCash += redirected;

  const listPrice = L.lpTokens > 0 ? lpCash / L.lpTokens : 0;
  const mcp = listPrice * L.supply;
  const circulating = Math.max(1, L.supply - L.lpTokens);
  const backing = (treasCash + lpCash) / circulating;

  return {
    basis: capped ? "at cap" : "at target (grows with demand)",
    listPrice: listPrice > 0 ? `$${formatPrice(listPrice)}` : "—",
    backing: `$${formatPrice(backing)}/tok`,
    mcp: `$${formatMcap(mcp)}`,
    foregoPct: foregoPct * 100,
  };
}

export function computeOverflowFromState(state: Parameters<typeof computeOverflowProjection>[0]): OverflowProjection | null {
  return computeOverflowProjection(state, solveFromState(state));
}
