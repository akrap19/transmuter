"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import { submitHolder, type HolderClients, type HolderKind, type HolderSubmit } from "@/lib/catalog/submit-holder";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { ChainTransactionError } from "@/lib/solana/tx";
import { toastError, toastSuccess } from "@/lib/toast";

export function useSubmitHolder(onConfirmed: () => void) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const run = useCallback(
    async (kind: HolderKind, chain: HolderSubmit, extra?: { amount?: string; yes?: boolean }) => {
      if (!wallet) {
        const message = "Connect a wallet to sign.";
        toastError(message);
        setError(message);
        return;
      }
      setBusy(true);
      setError(null);
      setExplorerUrl(null);
      try {
        const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
        const client = createTransmuterClient(provider);
        const confirmed = await submitHolder({
          kind,
          amount: extra?.amount,
          yes: extra?.yes,
          chain: { ...chain, signer: wallet.publicKey },
          programs: {
            staking: client.staking,
            vesting: client.vesting,
            escrow: client.runwayEscrow,
            eol: client.eolToken,
          } as unknown as HolderClients,
          connection,
          signer: wallet,
        });
        setExplorerUrl(confirmed.explorerUrl);
        toastSuccess("Transaction confirmed");
        onConfirmed();
      } catch (err) {
        const message = err instanceof Error ? err.message : "The transaction failed.";
        toastError(message);
        setError(message);
        setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
      } finally {
        setBusy(false);
      }
    },
    [connection, onConfirmed, wallet],
  );

  return { busy, error, explorerUrl, run };
}
