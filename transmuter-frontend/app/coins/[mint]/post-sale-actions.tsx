"use client";

import { WalletGate } from "@/components/catalog/wallet-gate";
import { batchProgressLabel, setupSteps, type PostSaleKind } from "@/lib/catalog/post-sale";
import { PostSaleStepsModal } from "./post-sale-steps-modal";
import type { PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { useSubmitPostSale } from "./use-submit-post-sale";

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
  const setup = setupSteps(offers);
  const claim = offers.includes("claimTokens");

  return (
    <WalletGate
      title="Connect to finish or claim"
      body="Finishing the close-out is signed once here and any wallet can do it. Each buyer claims their own tokens."
    >
      {() => (
        <>
        <div className="coin-actions coin-actions-row">
          <div className="coin-buttons">
            {setup.length > 0 ? (
              <button
                type="button"
                className="button button-primary"
                disabled={tx.busy}
                onClick={() => void tx.runBatch("setup", chain, setup)}
              >
                {tx.pending === "batch" ? batchProgressLabel(tx.progress) : "Finish setup"}
              </button>
            ) : null}
            {claim ? (
              <button
                type="button"
                className={setup.length > 0 ? "button button-ghost" : "button button-primary"}
                disabled={tx.busy}
                onClick={() => void tx.run("claimTokens", chain)}
              >
                {tx.pending === "claimTokens" ? "Signing…" : "Claim tokens"}
              </button>
            ) : null}
          </div>
          {tx.explorerUrl ? (
            <a className="coin-tx-link" href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
              View transaction
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
        {tx.steps ? <PostSaleStepsModal title="Finishing setup" tx={tx} /> : null}
        </>
      )}
    </WalletGate>
  );
}
