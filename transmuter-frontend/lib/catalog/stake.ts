import type { CoinStake, LaunchStatus } from "./types";

export const STAKE_FEE_BPS = 0;

export type StakeAction = { kind: "stake"; amount: number } | { kind: "unstake"; amount: number };

export type StakeActionResult =
  | { ok: true; amount: number; gross: number }
  | { ok: false; reason: string };

export function stakingAvailable(status: LaunchStatus) {
  return status === "active" || status === "liquidating";
}

export function grossUp(amount: number, feeBps: number) {
  if (feeBps <= 0) return amount;
  const denom = 10_000 - feeBps;
  if (denom <= 0) return amount;
  return (amount * 10_000) / denom;
}

export function voterLocked(lockUntil: number | null, now: number) {
  return lockUntil != null && now < lockUntil;
}

export function evaluateStakeAction(
  status: LaunchStatus,
  stake: CoinStake,
  now: number,
  action: StakeAction,
): StakeActionResult {
  if (!stakingAvailable(status)) return { ok: false, reason: "status" };
  if (action.amount <= 0) return { ok: false, reason: "amount" };

  if (action.kind === "stake") {
    if (stake.liquidated) return { ok: false, reason: "liquidated" };
    if (action.amount > stake.walletBalance) return { ok: false, reason: "balance" };
    return { ok: true, amount: action.amount, gross: grossUp(action.amount, stake.feeBps) };
  }

  if (voterLocked(stake.voterLockedUntil, now)) return { ok: false, reason: "lock" };
  if (action.amount > stake.staked) return { ok: false, reason: "credit" };
  return { ok: true, amount: action.amount, gross: grossUp(action.amount, stake.feeBps) };
}
