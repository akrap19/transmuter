"use client";

import type { PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { useSubmitPostSale } from "./use-submit-post-sale";

export function SaleFinalize({ chain, onConfirmed }: { chain: PostSaleChain; onConfirmed: () => void }) {
  const tx = useSubmitPostSale(onConfirmed);
  return (
    <div className="sale-finalize">
      <button
        type="button"
        className="button button-primary button-sm"
        disabled={tx.busy}
        onClick={() => void tx.run("finalize", chain)}
      >
        {tx.busy ? "Signing…" : "Finalize sale"}
      </button>
      {tx.explorerUrl ? (
        <a className="coin-tx-link" href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
          View transaction<span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
