"use client";

import { useOwnedBalances } from "@/components/catalog/use-owned-balances";
import { formatUsd } from "@/lib/catalog/format";
import { usdcMint } from "@/lib/solana/config";
import type { SaleSnapshot } from "@/lib/catalog/types";

export function SaleForm({
  wallet,
  revision,
  sale,
  amount,
  busy,
  notice,
  explorerUrl,
  onAmount,
  onDeposit,
  onWithdraw,
}: {
  wallet: string;
  revision: number;
  sale: SaleSnapshot;
  amount: string;
  busy: boolean;
  notice: string | null;
  explorerUrl: string | null;
  onAmount: (value: string) => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const accounts = useOwnedBalances(wallet, revision);
  const walletUsdc = accounts?.find((row) => row.mint === usdcMint)?.amount ?? 0;

  return (
    <div className="coin-actions">
      <label className="coin-field">
        <span>Deposit USDC · wallet {accounts == null ? "…" : formatUsd(walletUsdc)}</span>
        <input inputMode="decimal" value={amount} disabled={busy} onChange={(event) => onAmount(event.target.value)} />
      </label>
      <div className="coin-buttons">
        <button type="button" className="button button-primary" disabled={busy} onClick={onDeposit}>
          {busy ? "Signing…" : "Deposit"}
        </button>
        <button type="button" className="button button-ghost" disabled={busy} onClick={onWithdraw}>
          Withdraw {formatUsd(sale.myDepositUsdc)}
        </button>
      </div>
      {notice ? <p className="coin-note">{notice}</p> : null}
      {explorerUrl ? (
        <p className="coin-note">
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            View transaction
          </a>
        </p>
      ) : null}
    </div>
  );
}
