"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useState } from "react";
import type { SaleKind } from "@/lib/catalog/sale";
import { submitSale, type EolSaleClient } from "@/lib/catalog/submit-sale";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { ChainTransactionError } from "@/lib/solana/tx";
import { toastError, toastSuccess } from "@/lib/toast";

export function useSubmitSale(mint: string, onConfirmed: () => void) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [pending, setPending] = useState<SaleKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const run = useCallback(
    async (kind: SaleKind, amount?: string) => {
      if (!wallet) {
        const message = "Connect a wallet to sign.";
        toastError(message);
        setError(message);
        return;
      }
      setPending(kind);
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
        toastSuccess(kind === "deposit" ? "Deposit confirmed" : "Withdrawal confirmed");
        onConfirmed();
      } catch (err) {
        const message = err instanceof Error ? err.message : "The transaction failed.";
        toastError(message);
        setError(message);
        setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
      } finally {
        setPending(null);
      }
    },
    [connection, mint, onConfirmed, wallet],
  );

  return { pending, error, explorerUrl, run };
}
