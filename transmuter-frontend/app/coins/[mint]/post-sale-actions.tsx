"use client";

import { WalletGate } from "@/components/catalog/wallet-gate";
import { postSaleButtonOrder, type PostSaleKind } from "@/lib/catalog/post-sale";
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
        <div className="coin-actions coin-actions-row">
          <div className="coin-buttons">
            {postSaleButtonOrder(offers).map((kind, index) => (
              <button
                key={kind}
                type="button"
                className={index === 0 ? "button button-primary" : "button button-ghost"}
                disabled={tx.busy}
                onClick={() => void tx.run(kind, chain)}
              >
                {tx.pending === kind ? "Signing…" : LABELS[kind]}
              </button>
            ))}
          </div>
          {tx.explorerUrl ? (
            <a className="coin-tx-link" href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
              View transaction
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      )}
    </WalletGate>
  );
}
