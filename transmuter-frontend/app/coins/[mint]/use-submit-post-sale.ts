"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import type { PostSaleKind } from "@/lib/catalog/post-sale";
import { runPostSale, type BatchClient, type StepEvent } from "@/lib/catalog/submit-post-sale-batch";
import { submitPostSale, type EolPostSaleClient, type FactoryOutcomeClient, type PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { ChainTransactionError } from "@/lib/solana/tx";
import { toastError, toastSuccess } from "@/lib/toast";

export type PostSaleProgress = { done: number; total: number };
export type FallbackStep = { kind: PostSaleKind; state: "waiting" | "active" | "done" | "failed"; error?: string };
type Pending = PostSaleKind | "batch";

export function useSubmitPostSale(onConfirmed: () => void) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [pending, setPending] = useState<Pending | null>(null);
  const [progress, setProgress] = useState<PostSaleProgress | null>(null);
  const [steps, setSteps] = useState<FallbackStep[] | null>(null);
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

  /**
   * Finalize plus everything that follows it, or just the jobs still open. One approval when the
   * wallet allows it. Otherwise each step is signed in turn, with the step modal open.
   */
  const runBatch = useCallback(
    (mode: "finalize" | "setup", chain: PostSaleChain, stepKinds?: PostSaleKind[]) =>
      guarded("batch", async (signer) => {
        const client = clientFor(signer);
        const confirmed = await runPostSale({
          mode,
          steps: stepKinds,
          chain: { ...chain, cranker: signer.publicKey },
          eol: client.eolToken as unknown as BatchClient,
          factory: client.factory as unknown as FactoryOutcomeClient,
          connection,
          signer,
          onProgress: (done, total) => setProgress({ done, total }),
          onFallback: (kinds) => setSteps(kinds.map((kind) => ({ kind, state: "waiting" }))),
          onStep: (event: StepEvent) =>
            setSteps((current) =>
              current?.map((step, index) =>
                index === event.index ? { ...step, state: event.state, error: event.error } : step,
              ) ?? null,
            ),
        });
        return confirmed[confirmed.length - 1].explorerUrl;
      }),
    [clientFor, connection, guarded],
  );

  return {
    busy: pending != null,
    pending,
    progress,
    steps,
    closeSteps: () => setSteps(null),
    error,
    explorerUrl,
    run,
    runBatch,
  };
}
