"use client";

import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";

export function LiquidationCranks({
  chain,
  offers,
  onConfirmed,
}: {
  chain: HolderSubmit;
  offers: { openVote: boolean; executeVote: boolean };
  onConfirmed: () => void;
}) {
  const tx = useSubmitHolder(onConfirmed);
  if (!offers.openVote && !offers.executeVote) return null;

  return (
    <WalletGate
      title="Connect to crank the vote"
      body="Opening and executing an end of life vote are permissionless. The creator is not required."
    >
      {() => (
        <div className="coin-actions">
          <div className="coin-buttons">
            {offers.openVote ? (
              <button
                type="button"
                className="button button-primary"
                disabled={tx.busy}
                onClick={() => void tx.run("openLiquidationVote", chain)}
              >
                {tx.busy ? "Signing…" : "Open end of life vote"}
              </button>
            ) : null}
            {offers.executeVote ? (
              <button
                type="button"
                className="button button-primary"
                disabled={tx.busy}
                onClick={() => void tx.run("executeLiquidation", chain)}
              >
                {tx.busy ? "Signing…" : "Execute end of life"}
              </button>
            ) : null}
          </div>
          {tx.explorerUrl ? (
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
