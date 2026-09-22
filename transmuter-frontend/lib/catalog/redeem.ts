import type { CoinRedeem, LaunchStatus, RedeemAsset } from "./types";

export const REDEMPTION_TREASURY_FEE_BPS = 35;

export type RedeemAction = { kind: "redeem"; amount: number } | { kind: "claim_legs" };

export type RedeemQuote = {
  grossCsol: number;
  treasuryFee: number;
  csolOwed: number;
  usdcOwed: number;
};

export type RedeemActionResult =
  | {
      ok: true;
      amount: number;
      csolOwed: number;
      usdcOwed: number;
      paid: Record<RedeemAsset, number>;
      stuck: Record<RedeemAsset, boolean>;
    }
  | { ok: false; reason: string };

export function redeemAvailable(status: LaunchStatus) {
  return status === "active" || status === "liquidating";
}

export function quoteRedeem(redeem: CoinRedeem, amount: number): RedeemQuote {
  const supply = redeem.circulatingSupply;
  const usdcPool = redeem.unconvertedUsdc + redeem.escrowUsdc;
  const grossCsol = supply <= 0 ? 0 : (amount * redeem.cTokenTreasury) / supply;
  const treasuryFee = (grossCsol * redeem.treasuryFeeBps) / 10_000;
  const usdcOwed = supply <= 0 ? 0 : (amount * usdcPool) / supply;
  return { grossCsol, treasuryFee, csolOwed: grossCsol - treasuryFee, usdcOwed };
}

export function unpaidLegs(redeem: CoinRedeem) {
  return redeem.legs
    .map((leg) => ({ ...leg, remaining: leg.owed - leg.paid }))
    .filter((leg) => leg.remaining > 0);
}

function settle(redeem: CoinRedeem, extraCsol: number, extraUsdc: number) {
  const csolDue = extraCsol + remaining(redeem, "cSOL");
  const usdcDue = extraUsdc + remaining(redeem, "USDC");
  const csolStuck = csolDue > 0 && redeem.treasuryCsolAvailable < csolDue;
  const usdcStuck = usdcDue > 0 && redeem.treasuryUsdcAvailable < usdcDue;
  return {
    paid: { cSOL: csolStuck ? 0 : csolDue, USDC: usdcStuck ? 0 : usdcDue },
    stuck: { cSOL: csolStuck, USDC: usdcStuck },
  };
}

function remaining(redeem: CoinRedeem, asset: RedeemAsset) {
  const leg = redeem.legs.find((row) => row.asset === asset);
  return leg ? leg.owed - leg.paid : 0;
}

export function evaluateRedeemAction(
  status: LaunchStatus,
  redeem: CoinRedeem,
  action: RedeemAction,
): RedeemActionResult {
  if (!redeemAvailable(status)) return { ok: false, reason: "status" };

  if (action.kind === "claim_legs") {
    if (unpaidLegs(redeem).length === 0) return { ok: false, reason: "zero" };
    const settled = settle(redeem, 0, 0);
    return { ok: true, amount: 0, csolOwed: 0, usdcOwed: 0, ...settled };
  }

  if (action.amount <= 0) return { ok: false, reason: "amount" };
  if (action.amount > redeem.walletBalance) return { ok: false, reason: "balance" };

  const quote = quoteRedeem(redeem, action.amount);
  const settled = settle(redeem, quote.csolOwed, quote.usdcOwed);
  return {
    ok: true,
    amount: action.amount,
    csolOwed: quote.csolOwed,
    usdcOwed: quote.usdcOwed,
    ...settled,
  };
}
