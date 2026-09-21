"use client";

import { useState } from "react";
import { RedeemForm } from "@/app/coins/[mint]/redeem-form";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getCoinDetail } from "@/lib/catalog/client";
import type { LaunchStatus } from "@/lib/catalog/types";

export function RedeemActions({ mint, status }: { mint: string; status: LaunchStatus }) {
  const [amount, setAmount] = useState("1");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <WalletGate
      title="Connect to redeem"
      body="Redemption and unpaid-leg retries are signed by the connected wallet. There is no login."
    >
      {(wallet) => {
        const redeem = getCoinDetail(mint, wallet)?.redeem;
        if (!redeem) return null;
        return (
          <RedeemForm
            amount={amount}
            message={message}
            redeem={redeem}
            status={status}
            onAmount={setAmount}
            onMessage={setMessage}
          />
        );
      }}
    </WalletGate>
  );
}
