import type { LaunchStatus, SaleSnapshot } from "./types";

export type SaleAction = { kind: "deposit"; amountUsdc: number } | { kind: "withdraw" };

export type SaleActionResult =
  | { ok: true; amountUsdc: number }
  | { ok: false; reason: string };

function beforeClose(status: LaunchStatus, sale: SaleSnapshot, now: number) {
  return status === "sale" && now < sale.closesAt;
}

export function evaluateSaleAction(
  status: LaunchStatus,
  sale: SaleSnapshot,
  now: number,
  action: SaleAction,
): SaleActionResult {
  if (status !== "sale") return { ok: false, reason: "status" };
  if (!beforeClose(status, sale, now)) return { ok: false, reason: "closed" };

  if (action.kind === "deposit") {
    if (!sale.depositsOpen) return { ok: false, reason: "closed" };
    if (action.amountUsdc <= 0) return { ok: false, reason: "amount" };
    if (action.amountUsdc > sale.remainingUsdc) return { ok: false, reason: "cap" };
    return { ok: true, amountUsdc: action.amountUsdc };
  }

  if (sale.myDepositUsdc <= 0) return { ok: false, reason: "credit" };
  return { ok: true, amountUsdc: sale.myDepositUsdc };
}
