"use client";

import { useState } from "react";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getCoinDetail } from "@/lib/catalog/client";
import { formatAmount } from "@/lib/catalog/format";
import { CATALOG_NOTICE } from "@/lib/catalog/mock";
import { evaluateVestingClaim } from "@/lib/catalog/vesting";
import type { CoinVesting } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  recipient: "Only the vesting recipient can claim this pot.",
  notStarted: "Start time has not been stamped.",
  zero: "Nothing is claimable yet.",
};

export function VestingActions({ mint }: { mint: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <WalletGate
      title="Connect to claim vested tokens"
      body="Vesting claims are signed by the recipient wallet. There is no login."
    >
      {(wallet) => {
        const vesting = getCoinDetail(mint, wallet)?.vesting;
        if (!vesting) return null;
        return <VestingClaim vesting={vesting} wallet={wallet} message={message} onMessage={setMessage} />;
      }}
    </WalletGate>
  );
}

function VestingClaim({
  vesting,
  wallet,
  message,
  onMessage,
}: {
  vesting: CoinVesting;
  wallet: string;
  message: string | null;
  onMessage: (value: string) => void;
}) {
  function run() {
    const result = evaluateVestingClaim(vesting, wallet, Math.floor(Date.now() / 1000));
    if (!result.ok) {
      onMessage(REASONS[result.reason] ?? result.reason);
      return;
    }
    onMessage(`Ready to sign a claim of ${formatAmount(result.amount)}. ${CATALOG_NOTICE}`);
  }

  return (
    <>
      <div className="catalog-sale-buttons">
        <button type="button" className="btn btn-gold" onClick={run}>
          Claim vested
        </button>
      </div>
      {message ? <p className="catalog-sale-note">{message}</p> : null}
    </>
  );
}
