"use client";

import { RedeemLegs } from "@/app/coins/[mint]/redeem-legs";
import { formatAmount, formatUsd } from "@/lib/catalog/format";
import { CATALOG_NOTICE } from "@/lib/catalog/mock";
import { evaluateRedeemAction } from "@/lib/catalog/redeem";
import type { CoinRedeem, LaunchStatus } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  status: "Redemption opens after finalize and stays open through liquidation.",
  amount: "Enter an amount greater than zero.",
  balance: "That amount exceeds the wallet balance.",
  zero: "No unpaid legs to retry.",
};

export function RedeemForm({
  redeem,
  status,
  amount,
  message,
  onAmount,
  onMessage,
}: {
  redeem: CoinRedeem;
  status: LaunchStatus;
  amount: string;
  message: string | null;
  onAmount: (value: string) => void;
  onMessage: (value: string) => void;
}) {
  function run(kind: "redeem" | "claim_legs") {
    const result = evaluateRedeemAction(
      status,
      redeem,
      kind === "redeem" ? { kind, amount: Number(amount) } : { kind: "claim_legs" },
    );
    if (!result.ok) {
      onMessage(REASONS[result.reason] ?? result.reason);
      return;
    }
    const stuck = result.stuck.USDC ? " USDC leg stuck; cSOL can still pay." : "";
    onMessage(
      kind === "redeem"
        ? `Ready to sign redeem of ${formatAmount(result.amount)} for ${formatAmount(result.csolOwed)} cSOL and ${formatUsd(result.usdcOwed)}.${stuck} ${CATALOG_NOTICE}`
        : `Ready to retry unpaid legs (${formatAmount(result.paid.USDC)} USDC, ${formatAmount(result.paid.cSOL)} cSOL).${stuck} ${CATALOG_NOTICE}`,
    );
  }

  return (
    <>
      <RedeemLegs legs={redeem.legs} />
      <div className="coin-actions">
        <label className="coin-field">
          <span>Burn amount ({formatAmount(redeem.walletBalance)} in wallet)</span>
          <input inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} />
        </label>
        <div className="coin-buttons">
          <button type="button" className="button button-primary" onClick={() => run("redeem")}>
            Redeem
          </button>
          <button type="button" className="button button-ghost" onClick={() => run("claim_legs")}>
            Retry unpaid legs
          </button>
        </div>
        {message ? <p className="coin-note">{message}</p> : null}
      </div>
    </>
  );
}
