"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { submitSale, type EolSaleClient } from "@/lib/catalog/submit-sale";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { ChainTransactionError } from "@/lib/solana/tx";

export function useSubmitSale(mint: string, onConfirmed: () => void) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const run = useCallback(
    async (kind: "deposit" | "withdraw", amount?: string) => {
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
        const confirmed = await submitSale({
          kind,
          amount,
          mint: new PublicKey(mint),
          depositor: wallet.publicKey,
          eol: client.eolToken as unknown as EolSaleClient,
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
    [connection, mint, onConfirmed, wallet],
  );

  return { busy, error, explorerUrl, run };
}
