"use client";

import { useCallback, useState } from "react";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { evaluateSaleAction } from "@/lib/catalog/sale";
import { usdcToAtoms } from "@/lib/catalog/sale-accounts";
import type { CoinDetail, SaleSnapshot } from "@/lib/catalog/types";
import { SaleForm } from "./sale-form";
import { useSubmitSale } from "./use-submit-sale";

const REASONS: Record<string, string> = {
  cap: "That amount exceeds the remaining sale cap.",
  closed: "The sale is closed.",
  status: "This launch is not in SALE.",
  amount: "Enter a USDC amount greater than zero.",
  credit: "No USDC deposit to withdraw.",
};

export function SaleActions({
  mint,
  status,
  sale,
  onConfirmed,
}: {
  mint: string;
  status: CoinDetail["status"];
  sale: SaleSnapshot;
  onConfirmed: () => void;
}) {
  const [amount, setAmount] = useState("250");
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
    onConfirmed();
  }, [onConfirmed]);
  const saleTx = useSubmitSale(mint, refresh);

  function run(kind: "deposit" | "withdraw") {
    const atoms = kind === "deposit" ? usdcToAtoms(amount) : null;
    if (kind === "deposit" && atoms == null) {
      setNotice(REASONS.amount);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const result = evaluateSaleAction(
      status,
      sale,
      now,
      kind === "deposit" ? { kind, amountUsdc: Number(atoms) / 1_000_000 } : { kind: "withdraw" },
    );
    if (!result.ok) {
      setNotice(REASONS[result.reason] ?? result.reason);
      return;
    }
    setNotice(null);
    void saleTx.run(kind, kind === "deposit" ? amount : undefined);
  }

  return (
    <WalletGate
      title="Connect to deposit USDC"
      body="Deposits and full withdrawals are signed by the connected wallet. There is no login."
    >
      {(wallet) => (
        <SaleForm
          wallet={wallet}
          revision={revision}
          amount={amount}
          busy={saleTx.busy}
          sale={sale}
          notice={saleTx.error ?? notice}
          explorerUrl={notice ? null : saleTx.explorerUrl}
          onAmount={setAmount}
          onDeposit={() => run("deposit")}
          onWithdraw={() => run("withdraw")}
        />
      )}
    </WalletGate>
  );
}
