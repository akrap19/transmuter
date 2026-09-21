import { vestedAmount } from "./schedule";
import type { CoinVesting } from "./types";

export type VestingClaimResult = { ok: true; amount: number } | { ok: false; reason: string };

export function vestedForEntry(vesting: CoinVesting, now: number) {
  if (vesting.liquidationTimestamp !== 0 && vesting.kind === "team") {
    return vesting.totalAllocation;
  }
  return vestedAmount(vesting.totalAllocation, vesting.startTime, now, vesting.schedule);
}

export function evaluateVestingClaim(vesting: CoinVesting, wallet: string, now: number): VestingClaimResult {
  if (wallet !== vesting.recipient) return { ok: false, reason: "recipient" };
  if (vesting.startTime === 0) return { ok: false, reason: "notStarted" };
  const claimable = vestedForEntry(vesting, now) - vesting.alreadyClaimed;
  if (claimable <= 0) return { ok: false, reason: "zero" };
  return { ok: true, amount: claimable };
}
