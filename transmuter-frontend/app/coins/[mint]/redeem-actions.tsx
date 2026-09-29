"use client";

import { useCallback, useState } from "react";
import { RedeemForm } from "@/app/coins/[mint]/redeem-form";
import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { tokenToAtoms } from "@/lib/catalog/holder-accounts";
import { evaluateRedeemAction } from "@/lib/catalog/redeem";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinRedeem, LaunchStatus } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  status: "Redemption opens after finalize and stays open through liquidation.",
  amount: "Enter an amount greater than zero.",
  balance: "That amount exceeds the wallet balance.",
};

export function RedeemActions({
  status,
  redeem,
  chain,
  onConfirmed,
}: {
  status: LaunchStatus;
  redeem: CoinRedeem;
  chain: HolderSubmit;
  onConfirmed: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(() => onConfirmed(), [onConfirmed]);
  const tx = useSubmitHolder(refresh);

  function run() {
    if (tokenToAtoms(amount, chain.decimals) == null) {
      setNotice(REASONS.amount);
      return;
    }
    const result = evaluateRedeemAction(status, redeem, { kind: "redeem", amount: Number(amount) });
    if (!result.ok) {
      setNotice(REASONS[result.reason] ?? result.reason);
      return;
    }
    setNotice(null);
    void tx.run("redeem", chain, { amount });
  }

  return (
    <WalletGate
      title="Connect to redeem"
      body="Redemption burns EOL and pays cSOL and USDC from the treasury. It stays open after liquidation."
    >
      {() => (
        <RedeemForm
          redeem={redeem}
          amount={amount}
          busy={tx.busy}
          notice={tx.error ?? notice}
          explorerUrl={notice ? null : tx.explorerUrl}
          onAmount={setAmount}
          onRedeem={run}
        />
      )}
    </WalletGate>
  );
}
