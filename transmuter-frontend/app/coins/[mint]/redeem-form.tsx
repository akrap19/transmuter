"use client";

import { RedeemLegs } from "@/app/coins/[mint]/redeem-legs";
import { formatAmount } from "@/lib/catalog/format";
import type { CoinRedeem } from "@/lib/catalog/types";

export function RedeemForm({
  redeem,
  amount,
  busy,
  notice,
  explorerUrl,
  onAmount,
  onRedeem,
}: {
  redeem: CoinRedeem;
  amount: string;
  busy: boolean;
  notice: string | null;
  explorerUrl: string | null;
  onAmount: (value: string) => void;
  onRedeem: () => void;
}) {
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
        <p className="coin-note">
          Outstanding cSOL and USDC legs are paid inside this redeem. The program has no separate retry.
        </p>
        {notice ? <p className="coin-note">{notice}</p> : null}
        {explorerUrl ? (
          <p className="coin-note">
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              View transaction
            </a>
          </p>
        ) : null}
      </div>
    </>
  );
}
