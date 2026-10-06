import { formatUsd } from "./format";
import type { LaunchStatus, SaleSnapshot } from "./types";

export type SaleKind = "deposit" | "withdraw";

export type SaleAction = { kind: "deposit"; amountUsdc: number } | { kind: "withdraw" };

export function saleButtonLabel(kind: SaleKind, pending: SaleKind | null, withdrawLabel: string): string {
  if (pending === kind) return "Signing…";
  return kind === "deposit" ? "Deposit" : withdrawLabel;
}

export type SaleActionResult =
  | { ok: true; amountUsdc: number }
  | { ok: false; reason: string };

/** Cap is integer USDC atoms. The panel rounds to cents, so $5 can be 4.999988. */
function depositThatFits(amountUsdc: number, remainingUsdc: number): number | null {
  if (amountUsdc <= remainingUsdc) return amountUsdc;
  if (formatUsd(amountUsdc) === formatUsd(remainingUsdc)) return remainingUsdc;
  return null;
}

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
    const amountUsdc = depositThatFits(action.amountUsdc, sale.remainingUsdc);
    if (amountUsdc == null) return { ok: false, reason: "cap" };
    return { ok: true, amountUsdc };
  }

  if (sale.myDepositUsdc <= 0) return { ok: false, reason: "credit" };
  return { ok: true, amountUsdc: sale.myDepositUsdc };
}
