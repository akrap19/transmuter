"use client";

import { useState } from "react";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getCoinDetail } from "@/lib/catalog/client";
import { formatUsd } from "@/lib/catalog/format";
import { CATALOG_NOTICE } from "@/lib/catalog/mock";
import { evaluateSaleAction } from "@/lib/catalog/sale";
import type { CoinDetail, SaleSnapshot } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  cap: "That amount exceeds the remaining sale cap.",
  closed: "The sale is closed.",
  status: "This launch is not in SALE.",
  amount: "Enter a USDC amount greater than zero.",
  credit: "No USDC deposit to withdraw.",
};

export function SaleActions({ mint, status }: { mint: string; status: CoinDetail["status"] }) {
  const [amount, setAmount] = useState("250");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <WalletGate
      title="Connect to deposit USDC"
      body="Deposits and full withdrawals are signed by the connected wallet. There is no login."
    >
      {(wallet) => {
        const sale = getCoinDetail(mint, wallet)?.sale;
        if (!sale) return null;
        return (
          <SaleForm
            amount={amount}
            message={message}
            sale={sale}
            status={status}
            onAmount={setAmount}
            onMessage={setMessage}
          />
        );
      }}
    </WalletGate>
  );
}

function SaleForm({
  sale,
  status,
  amount,
  message,
  onAmount,
  onMessage,
}: {
  sale: SaleSnapshot;
  status: CoinDetail["status"];
  amount: string;
  message: string | null;
  onAmount: (value: string) => void;
  onMessage: (value: string) => void;
}) {
  function run(kind: "deposit" | "withdraw") {
    const now = Math.floor(Date.now() / 1000);
    const parsed = kind === "deposit" ? Number(amount) : 0;
    const result = evaluateSaleAction(
      status,
      sale,
      now,
      kind === "deposit" ? { kind, amountUsdc: parsed } : { kind: "withdraw" },
    );
    if (!result.ok) {
      onMessage(REASONS[result.reason] ?? result.reason);
      return;
    }
    onMessage(
      kind === "deposit"
        ? `Ready to sign deposit of ${formatUsd(result.amountUsdc)}. ${CATALOG_NOTICE}`
        : `Ready to sign a full withdraw of ${formatUsd(result.amountUsdc)}. ${CATALOG_NOTICE}`,
    );
  }

  return (
    <div className="coin-actions">
      <label className="coin-field">
        <span>Deposit USDC</span>
        <input inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} />
      </label>
      <div className="coin-buttons">
        <button type="button" className="button button-primary" onClick={() => run("deposit")}>
          Deposit
        </button>
        <button type="button" className="button button-ghost" onClick={() => run("withdraw")}>
          Withdraw {formatUsd(sale.myDepositUsdc)}
        </button>
      </div>
      {message ? <p className="coin-note">{message}</p> : null}
    </div>
  );
}
