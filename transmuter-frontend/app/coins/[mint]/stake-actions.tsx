"use client";

import { useCallback, useState } from "react";
import { StakeForm } from "@/app/coins/[mint]/stake-form";
import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { tokenToAtoms } from "@/lib/catalog/holder-accounts";
import { evaluateStakeAction } from "@/lib/catalog/stake";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinStake, LaunchStatus } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  balance: "That amount exceeds the wallet balance.",
  status: "Staking is not open for this launch.",
  amount: "Enter an amount greater than zero.",
  credit: "Not enough staked to unstake.",
  lock: "Unstake is voter-locked until the lock expires.",
  liquidated: "Stake is off after liquidation. Unstake remains open.",
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
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(() => onConfirmed(), [onConfirmed]);
  const tx = useSubmitHolder(refresh);

  function run(kind: "stake" | "unstake") {
    if (tokenToAtoms(amount, chain.decimals) == null) {
      setNotice(REASONS.amount);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const result = evaluateStakeAction(status, stake, now, { kind, amount: Number(amount) });
    if (!result.ok) {
      setNotice(REASONS[result.reason] ?? result.reason);
      return;
    }
    setNotice(null);
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
          notice={tx.error ?? notice}
          explorerUrl={notice ? null : tx.explorerUrl}
          onAmount={setAmount}
          onStake={() => run("stake")}
          onUnstake={() => run("unstake")}
        />
      )}
    </WalletGate>
  );
}
