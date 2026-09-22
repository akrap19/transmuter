"use client";

import { useState } from "react";
import { StakeForm } from "@/app/coins/[mint]/stake-form";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getCoinDetail } from "@/lib/catalog/client";
import type { LaunchStatus } from "@/lib/catalog/types";

export function StakeActions({ mint, status }: { mint: string; status: LaunchStatus }) {
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <WalletGate
      title="Connect to stake"
      body="Stake, unstake, and voter-lock are signed by the connected wallet. There is no login."
    >
      {(wallet) => {
        const detail = getCoinDetail(mint, wallet);
        if (!detail?.stake) return null;
        return (
          <StakeForm
            amount={amount}
            message={message}
            stake={detail.stake}
            status={status}
            symbol={detail.symbol}
            onAmount={setAmount}
            onMessage={setMessage}
          />
        );
      }}
    </WalletGate>
  );
}
