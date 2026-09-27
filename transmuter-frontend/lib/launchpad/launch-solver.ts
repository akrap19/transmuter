import type { LaunchSolveInput, LaunchSolveResult } from "./types";
import { TREASURY_ASK } from "./floors";

export function formatNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toString();
}

export function formatMcap(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export function formatPrice(x: number): string {
  if (x < 0.01) return x.toFixed(6);
  if (x < 1) return x.toFixed(4);
  return x.toFixed(2);
}

export function launchSolve(input: LaunchSolveInput): LaunchSolveResult | null {
  const supply = input.tokenSupply;
  const escrowNeed = Math.max(0, input.escrowNeed);
  const lpPct = input.allocLP / 100;
  const salePct = input.allocPublic / 100;
  const userRaise = input.targetRaise;
  const treasuryAsk = Math.max(TREASURY_ASK, input.treasuryAsk ?? TREASURY_ASK);

  if (!supply || isNaN(supply) || salePct <= 0) return null;

  const denom = 1 - (lpPct + treasuryAsk) / salePct;
  if (denom <= 0) {
    return { feasible: false, lpPct, salePct, treasPct: treasuryAsk };
  }

  const minRaise = escrowNeed > 0 ? escrowNeed / denom : 0;

  let R = userRaise !== null && !isNaN(userRaise) ? userRaise : minRaise;
  let clampedUp = false;

  if (R < minRaise * (1 - 1e-9)) {
    R = minRaise;
    clampedUp = true;
  } else if (R < minRaise) {
    R = minRaise;
  }

  if (!R || R <= 0) {
    return {
      feasible: false,
      needRaise: true,
      lpPct,
      salePct,
      minRaise,
      treasPct: treasuryAsk,
    };
  }

  const mcp = R / salePct;
  const price = mcp / supply;
  const lpCash = lpPct * mcp;
  const treasury = R - lpCash - escrowNeed;
  const lpTokens = lpPct * supply;
  const treasPctMCP = mcp > 0 ? treasury / mcp : 0;
  const feasible = treasPctMCP >= treasuryAsk - 1e-9;

  return {
    feasible,
    supply,
    escrowNeed,
    lpPct,
    salePct,
    minRaise,
    R,
    minRaiseUsed: R,
    clampedUp,
    mcp,
    price,
    lpCash,
    treasury,
    lpTokens,
    treasPct: treasPctMCP,
    treasPctMCP,
    ceilingPct: salePct - lpPct,
    lpFrac: lpCash / R,
    treasFrac: treasury / R,
    escrowFrac: escrowNeed / R,
  };
}

export function getLaunchSolveInput(state: {
  tokenSupply: string;
  escrowNeed: string;
  allocLP: number;
  allocPublic: number;
  targetRaise: string;
  treasuryBackingPct?: number;
}): LaunchSolveInput {
  const supply = parseFloat(state.tokenSupply);
  return {
    tokenSupply: supply && !isNaN(supply) ? supply : null,
    escrowNeed: Math.max(0, parseFloat(state.escrowNeed) || 0),
    allocLP: state.allocLP,
    allocPublic: state.allocPublic,
    targetRaise: (() => {
      const v = parseFloat(state.targetRaise);
      return v && !isNaN(v) ? v : null;
    })(),
    treasuryAsk: (state.treasuryBackingPct ?? TREASURY_ASK * 100) / 100,
  };
}

export function solveFromState(state: {
  tokenSupply: string;
  escrowNeed: string;
  allocLP: number;
  allocPublic: number;
  targetRaise: string;
  treasuryBackingPct?: number;
}): LaunchSolveResult | null {
  return launchSolve(getLaunchSolveInput(state));
}
