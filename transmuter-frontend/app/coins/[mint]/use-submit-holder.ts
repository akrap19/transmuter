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
  const [pending, setPending] = useState<HolderKind | null>(null);
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
      setPending(kind);
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
        const message = holderFailureMessage(err);
        toastError(message);
        setError(message);
        setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
      } finally {
        setPending(null);
      }
    },
    [connection, onConfirmed, wallet],
  );

  return { busy: pending != null, pending, error, explorerUrl, run };
}

function holderFailureMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "The transaction failed.";
  const code = err instanceof ChainTransactionError ? err.code : undefined;
  if (code === "VoterLock" || /voter lock has not expired/i.test(message)) {
    return "You cannot unstake because of governance voting.";
  }
  if (code === "AlreadyVoted" || /you already voted/i.test(message)) {
    return "You already voted. A wallet can vote once.";
  }
  return message;
}
