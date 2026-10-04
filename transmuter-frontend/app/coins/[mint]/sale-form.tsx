"use client";

import { useOwnedBalances } from "@/components/catalog/use-owned-balances";
import { formatUsd } from "@/lib/catalog/format";
import { saleButtonLabel, type SaleKind } from "@/lib/catalog/sale";
import { usdcMint } from "@/lib/solana/config";
import type { SaleSnapshot } from "@/lib/catalog/types";

export function SaleForm({
  wallet,
  revision,
  sale,
  depositKnown,
  amount,
  pending,
  explorerUrl,
  onAmount,
  onDeposit,
  onWithdraw,
}: {
  wallet: string;
  revision: number;
  sale: SaleSnapshot;
  depositKnown: boolean;
  amount: string;
  pending: SaleKind | null;
  explorerUrl: string | null;
  onAmount: (value: string) => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const accounts = useOwnedBalances(wallet, revision);
  const walletUsdc = accounts?.find((row) => row.mint === usdcMint)?.amount ?? 0;
  const busy = pending != null;
  const withdrawLabel = `Withdraw ${depositKnown ? formatUsd(sale.myDepositUsdc) : "…"}`;

  return (
    <div className="coin-actions">
      {sale.depositsOpen ? (
        <label className="coin-field">
          <span>Deposit USDC · wallet {accounts == null ? "…" : formatUsd(walletUsdc)}</span>
          <input inputMode="decimal" value={amount} disabled={busy} onChange={(event) => onAmount(event.target.value)} />
        </label>
      ) : null}
      <div className="coin-buttons">
        {sale.depositsOpen ? (
          <button type="button" className="button button-primary" disabled={busy} onClick={onDeposit}>
            {saleButtonLabel("deposit", pending, withdrawLabel)}
          </button>
        ) : null}
        <button type="button" className="button button-ghost" disabled={busy || !depositKnown} onClick={onWithdraw}>
          {saleButtonLabel("withdraw", pending, withdrawLabel)}
        </button>
      </div>
      {explorerUrl ? (
        <a className="coin-tx-link" href={explorerUrl} target="_blank" rel="noopener noreferrer">
          View transaction
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
