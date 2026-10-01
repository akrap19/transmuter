"use client";

import { useCallback, useState } from "react";
import { RedeemForm } from "@/app/coins/[mint]/redeem-form";
import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { tokenToAtoms } from "@/lib/catalog/holder-accounts";
import { evaluateRedeemAction } from "@/lib/catalog/redeem";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinRedeem, LaunchStatus } from "@/lib/catalog/types";
import { toastError } from "@/lib/toast";

const REASONS: Record<string, string> = {
  status: "Redemption opens after finalize and stays open through end of life.",
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
  const refresh = useCallback(() => onConfirmed(), [onConfirmed]);
  const tx = useSubmitHolder(refresh);

  function run() {
    if (tokenToAtoms(amount, chain.decimals) == null) {
      toastError(REASONS.amount);
      return;
    }
    const result = evaluateRedeemAction(status, redeem, { kind: "redeem", amount: Number(amount) });
    if (!result.ok) {
      toastError(REASONS[result.reason] ?? result.reason);
      return;
    }
    void tx.run("redeem", chain, { amount });
  }

  return (
    <WalletGate
      title="Connect to redeem"
      body="Redemption burns EOL and pays the base asset and USDC from the treasury. It stays open after end of life."
    >
      {() => (
        <RedeemForm
          redeem={redeem}
          amount={amount}
          busy={tx.busy}
          explorerUrl={tx.explorerUrl}
          onAmount={setAmount}
          onRedeem={run}
        />
      )}
    </WalletGate>
  );
}
