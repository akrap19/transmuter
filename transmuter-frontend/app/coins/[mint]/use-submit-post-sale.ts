"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import type { PostSaleKind } from "@/lib/catalog/post-sale";
import { submitPostSale, type EolPostSaleClient, type PostSaleChain } from "@/lib/catalog/submit-post-sale";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { ChainTransactionError } from "@/lib/solana/tx";

export function useSubmitPostSale(onConfirmed: () => void) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const run = useCallback(
    async (kind: PostSaleKind, chain: PostSaleChain) => {
      if (!wallet) {
        setError("Connect a wallet to sign.");
        return;
      }
      setBusy(true);
      setError(null);
      setExplorerUrl(null);
      try {
        const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
        const client = createTransmuterClient(provider);
        const confirmed = await submitPostSale({
          kind,
          chain: { ...chain, cranker: wallet.publicKey },
          eol: client.eolToken as unknown as EolPostSaleClient,
          connection,
          signer: wallet,
        });
        setExplorerUrl(confirmed.explorerUrl);
        onConfirmed();
      } catch (err) {
        setError(err instanceof Error ? err.message : "The transaction failed.");
        setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
      } finally {
        setBusy(false);
      }
    },
    [connection, onConfirmed, wallet],
  );

  return { busy, error, explorerUrl, run };
}
