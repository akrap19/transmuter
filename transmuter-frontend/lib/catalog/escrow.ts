import { vestedAmount } from "./schedule";
import type { CoinEscrow } from "./types";

export type EscrowDrawResult = { ok: true; amount: number } | { ok: false; reason: string };

export function releasedToDate(escrow: CoinEscrow, now: number) {
  const scheduled = vestedAmount(escrow.fundedPrincipal, escrow.startTime, now, escrow.schedule);
  return Math.min(scheduled + escrow.advanceUnlocked, escrow.fundedPrincipal);
}

export function evaluateEscrowDraw(escrow: CoinEscrow, wallet: string, now: number): EscrowDrawResult {
  if (wallet !== escrow.teamRecipient) return { ok: false, reason: "recipient" };
  if (escrow.status === "halted") return { ok: false, reason: "halted" };
  if (escrow.status === "liquidated") return { ok: false, reason: "liquidated" };
  if (escrow.status !== "active") return { ok: false, reason: "status" };
  if (escrow.startTime === 0) return { ok: false, reason: "notStarted" };
  const drawable = releasedToDate(escrow, now) - escrow.alreadyDrawn;
  if (drawable <= 0) return { ok: false, reason: "zero" };
  return { ok: true, amount: drawable };
}
