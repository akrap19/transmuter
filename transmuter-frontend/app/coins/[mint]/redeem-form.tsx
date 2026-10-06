"use client";

import { RedeemLegs } from "@/app/coins/[mint]/redeem-legs";
import { formatAmount, formatUsd } from "@/lib/catalog/format";
import { quoteRedeem } from "@/lib/catalog/redeem";
import type { CoinRedeem } from "@/lib/catalog/types";

export function RedeemForm({
  redeem,
  amount,
  busy,
  explorerUrl,
  onAmount,
  onRedeem,
}: {
  redeem: CoinRedeem;
  amount: string;
  busy: boolean;
  explorerUrl: string | null;
  onAmount: (value: string) => void;
  onRedeem: () => void;
}) {
  const burn = Number(amount);
  const quote = Number.isFinite(burn) && burn > 0 ? quoteRedeem(redeem, burn) : null;

  return (
    <>
      <RedeemLegs legs={redeem.legs} />
      <div className="coin-actions">
        <label className="coin-field">
          <span>Burn amount ({formatAmount(redeem.walletBalance)} in wallet)</span>
          <input inputMode="decimal" value={amount} disabled={busy} onChange={(event) => onAmount(event.target.value)} />
        </label>
        <div className="coin-buttons">
          <button type="button" className="button button-primary" disabled={busy} onClick={onRedeem}>
            {busy ? "Signing…" : "Redeem"}
          </button>
        </div>
        {quote ? (
          <p className="coin-payout">
            This burn pays <strong>{formatAmount(quote.csolOwed)} cSOL</strong> and{" "}
            <strong>{formatUsd(quote.usdcOwed)}</strong>.
          </p>
        ) : null}
        <p className="coin-note">
          Outstanding cSOL and USDC legs are paid inside this redeem. The program has no separate retry.
        </p>
        {explorerUrl ? (
          <a className="coin-tx-link" href={explorerUrl} target="_blank" rel="noopener noreferrer">
            View transaction
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </>
  );
}
