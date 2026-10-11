"use client";

import { batchProgressLabel } from "@/lib/catalog/post-sale";
import type { PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { PostSaleStepsModal } from "./post-sale-steps-modal";
import { useSubmitPostSale } from "./use-submit-post-sale";

/** Finalize and the whole close-out behind it, under one wallet approval. */
export function SaleFinalize({ chain, onConfirmed }: { chain: PostSaleChain; onConfirmed: () => void }) {
  const tx = useSubmitPostSale(onConfirmed);
  return (
    <>
    <div className="sale-finalize">
      <button
        type="button"
        className="button button-primary button-sm"
        disabled={tx.busy}
        onClick={() => void tx.runBatch("finalize", chain)}
      >
        {tx.busy ? batchProgressLabel(tx.progress) : "Finalize sale"}
      </button>
      {tx.explorerUrl ? (
        <a className="coin-tx-link" href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
          View transaction<span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
    {tx.steps ? <PostSaleStepsModal title="Finalizing sale" tx={tx} /> : null}
    </>
  );
}
