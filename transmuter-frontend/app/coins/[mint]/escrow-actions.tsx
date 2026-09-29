"use client";

import { useState } from "react";
import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { evaluateEscrowDraw } from "@/lib/catalog/escrow";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinEscrow } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  recipient: "Only the team recipient can draw runway USDC.",
  halted: "Escrow is halted. Resume is a holder vote in Governance.",
  liquidated: "Liquidation returned undrawn runway to the treasury.",
  notStarted: "Start time has not been stamped.",
  zero: "Nothing is drawable yet.",
};

export function EscrowActions({
  escrow,
  chain,
  onConfirmed,
}: {
  escrow: CoinEscrow;
  chain: HolderSubmit;
  onConfirmed: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const tx = useSubmitHolder(onConfirmed);

  return (
    <WalletGate
      title="Connect to draw runway"
      body="Draw is signed by the team recipient. Halt, resume, and advance stay in Governance."
    >
      {(wallet) => (
        <div className="coin-actions">
          <div className="coin-buttons">
            <button
              type="button"
              className="button button-primary"
              disabled={tx.busy || !chain.escrow}
              onClick={() => {
                const result = evaluateEscrowDraw(escrow, wallet, Math.floor(Date.now() / 1000));
                if (!result.ok) {
                  setNotice(REASONS[result.reason] ?? result.reason);
                  return;
                }
                setNotice(null);
                void tx.run("escrowDraw", chain);
              }}
            >
              {tx.busy ? "Signing…" : "Draw"}
            </button>
          </div>
          {tx.error ?? notice ? <p className="coin-note">{tx.error ?? notice}</p> : null}
          {tx.explorerUrl && !notice ? (
            <p className="coin-note">
              <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
                View transaction
              </a>
            </p>
          ) : null}
        </div>
      )}
    </WalletGate>
  );
}
