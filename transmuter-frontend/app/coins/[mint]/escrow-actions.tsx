"use client";

import { useState } from "react";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getCoinDetail } from "@/lib/catalog/client";
import { evaluateEscrowDraw } from "@/lib/catalog/escrow";
import { formatUsd } from "@/lib/catalog/format";
import { CATALOG_NOTICE } from "@/lib/catalog/mock";
import type { CoinEscrow } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  recipient: "Only the team recipient can draw runway USDC.",
  halted: "Escrow is halted. Resume is a holder vote in Governance.",
  liquidated: "Liquidation returned undrawn runway to the treasury.",
  notStarted: "Start time has not been stamped.",
  zero: "Nothing is drawable yet.",
};

export function EscrowActions({ mint }: { mint: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <WalletGate
      title="Connect to draw runway"
      body="Draw is signed by the team recipient. Halt, resume, and advance stay in Governance."
    >
      {(wallet) => {
        const escrow = getCoinDetail(mint, wallet)?.escrow;
        if (!escrow) return null;
        return <EscrowDraw escrow={escrow} wallet={wallet} message={message} onMessage={setMessage} />;
      }}
    </WalletGate>
  );
}

function EscrowDraw({
  escrow,
  wallet,
  message,
  onMessage,
}: {
  escrow: CoinEscrow;
  wallet: string;
  message: string | null;
  onMessage: (value: string) => void;
}) {
  function run() {
    const result = evaluateEscrowDraw(escrow, wallet, Math.floor(Date.now() / 1000));
    if (!result.ok) {
      onMessage(REASONS[result.reason] ?? result.reason);
      return;
    }
    onMessage(`Ready to sign a draw of ${formatUsd(result.amount)}. ${CATALOG_NOTICE}`);
  }

  return (
    <>
      <div className="catalog-sale-buttons">
        <button type="button" className="btn btn-gold" onClick={run}>
          Draw
        </button>
      </div>
      {message ? <p className="catalog-sale-note">{message}</p> : null}
    </>
  );
}
