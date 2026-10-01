"use client";

import { WalletGate } from "@/components/catalog/wallet-gate";
import type { PostSaleKind } from "@/lib/catalog/post-sale";
import type { PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { useSubmitPostSale } from "./use-submit-post-sale";

const LABELS: Record<PostSaleKind, string> = {
  finalize: "Finalize sale",
  convertTreasury: "Convert treasury",
  seedRaydiumUsdc: "Seed EOL/USDC pool",
  seedRaydiumWsol: "Seed EOL/SOL pool",
  claimTokens: "Claim tokens",
};

export function PostSaleActions({
  offers,
  chain,
  onConfirmed,
}: {
  offers: PostSaleKind[];
  chain: PostSaleChain;
  onConfirmed: () => void;
}) {
  const tx = useSubmitPostSale(onConfirmed);

  return (
    <WalletGate
      title="Connect to finalize or claim"
      body="Finalize, treasury conversion, LP seeding, and token claims are signed here. Any wallet can crank them. The creator is not required."
    >
      {() => (
        <div className="coin-actions">
          <div className="coin-buttons">
            {offers.map((kind) => (
              <button
                key={kind}
                type="button"
                className={kind === "claimTokens" || kind === "finalize" ? "button button-primary" : "button button-ghost"}
                disabled={tx.busy}
                onClick={() => void tx.run(kind, chain)}
              >
                {tx.busy ? "Signing…" : LABELS[kind]}
              </button>
            ))}
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
