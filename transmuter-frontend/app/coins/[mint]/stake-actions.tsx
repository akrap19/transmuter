"use client";

import { useCallback, useState } from "react";
import { StakeForm } from "@/app/coins/[mint]/stake-form";
import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { tokenToAtoms } from "@/lib/catalog/holder-accounts";
import { evaluateStakeAction } from "@/lib/catalog/stake";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinStake, LaunchStatus } from "@/lib/catalog/types";
import { toastError } from "@/lib/toast";

const REASONS: Record<string, string> = {
  balance: "That amount exceeds the wallet balance.",
  status: "Staking is not open for this launch.",
  amount: "Enter an amount greater than zero.",
  credit: "Not enough staked to unstake.",
  lock: "Unstake is voter-locked until the lock expires.",
  liquidated: "Stake is off after end of life. Unstake remains open.",
};

export function StakeActions({
  status,
  stake,
  chain,
  onConfirmed,
}: {
  status: LaunchStatus;
  stake: CoinStake;
  chain: HolderSubmit;
  onConfirmed: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const refresh = useCallback(() => onConfirmed(), [onConfirmed]);
  const tx = useSubmitHolder(refresh);

  function run(kind: "stake" | "unstake") {
    if (tokenToAtoms(amount, chain.decimals) == null) {
      toastError(REASONS.amount);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const result = evaluateStakeAction(status, stake, now, { kind, amount: Number(amount) });
    if (!result.ok) {
      toastError(REASONS[result.reason] ?? result.reason);
      return;
    }
    void tx.run(kind, chain, { amount });
  }

  return (
    <WalletGate
      title="Connect to stake"
      body="Stake and unstake are signed by the connected wallet. Unstake returns only to this wallet."
    >
      {() => (
        <StakeForm
          stake={stake}
          amount={amount}
          busy={tx.busy}
          explorerUrl={tx.explorerUrl}
          onAmount={setAmount}
          onStake={() => run("stake")}
          onUnstake={() => run("unstake")}
        />
      )}
    </WalletGate>
  );
}
