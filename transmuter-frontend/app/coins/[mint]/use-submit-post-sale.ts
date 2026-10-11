"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import type { PostSaleKind } from "@/lib/catalog/post-sale";
import { submitPostSaleBatch, type BatchClient } from "@/lib/catalog/submit-post-sale-batch";
import { submitPostSale, type EolPostSaleClient, type FactoryOutcomeClient, type PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { ChainTransactionError } from "@/lib/solana/tx";
import { toastError, toastSuccess } from "@/lib/toast";

export type PostSaleProgress = { done: number; total: number };
type Pending = PostSaleKind | "batch";

export function useSubmitPostSale(onConfirmed: () => void) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [pending, setPending] = useState<Pending | null>(null);
  const [progress, setProgress] = useState<PostSaleProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const guarded = useCallback(
    async (key: Pending, work: (signer: NonNullable<typeof wallet>) => Promise<string>) => {
      if (!wallet) {
        const message = "Connect a wallet to sign.";
        toastError(message);
        setError(message);
        return;
      }
      setPending(key);
      setProgress(null);
      setError(null);
      setExplorerUrl(null);
      try {
        setExplorerUrl(await work(wallet));
        toastSuccess("Transaction confirmed");
        onConfirmed();
      } catch (err) {
        const message = err instanceof Error ? err.message : "The transaction failed.";
        toastError(message);
        setError(message);
        setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
        // An earlier step may already have landed. Refresh so the panel offers what is left.
        if (err instanceof ChainTransactionError && err.signature) onConfirmed();
      } finally {
        setPending(null);
        setProgress(null);
      }
    },
    [onConfirmed, wallet],
  );

  const clientFor = useCallback(
    (signer: NonNullable<typeof wallet>) => createTransmuterClient(new AnchorProvider(connection, signer, { commitment: "confirmed" })),
    [connection],
  );

  const run = useCallback(
    (kind: PostSaleKind, chain: PostSaleChain) =>
      guarded(kind, async (signer) => {
        const client = clientFor(signer);
        const confirmed = await submitPostSale({
          kind,
          chain: { ...chain, cranker: signer.publicKey },
          eol: client.eolToken as unknown as EolPostSaleClient,
          factory: client.factory as unknown as FactoryOutcomeClient,
          connection,
          signer,
        });
        return confirmed.explorerUrl;
      }),
    [clientFor, connection, guarded],
  );

  /** Finalize plus everything that follows it, or just the jobs still open, under one wallet approval. */
  const runBatch = useCallback(
    (mode: "finalize" | "setup", chain: PostSaleChain, steps?: PostSaleKind[]) =>
      guarded("batch", async (signer) => {
        const client = clientFor(signer);
        const confirmed = await submitPostSaleBatch({
          mode,
          steps,
          chain: { ...chain, cranker: signer.publicKey },
          eol: client.eolToken as unknown as BatchClient,
          factory: client.factory as unknown as FactoryOutcomeClient,
          connection,
          signer,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        return confirmed[confirmed.length - 1].explorerUrl;
      }),
    [clientFor, connection, guarded],
  );

  return { busy: pending != null, pending, progress, error, explorerUrl, run, runBatch };
}
