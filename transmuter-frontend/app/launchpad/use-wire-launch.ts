"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserSession, clearMintSecret, loadMintSecret } from "@/lib/launchpad/mint-secret";
import { submitWireStep, type FactoryWireClient } from "@/lib/launchpad/submit-wire";
import { prepareWireStep, type WireLaunch } from "@/lib/launchpad/wire-accounts";
import {
  WIRE_EOL,
  buildWireChecklist,
  nextWireStep,
  type WireChecklistItem,
  type WireStepId,
} from "@/lib/launchpad/wire-plan";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { factoryPda, launchPda } from "@/lib/solana/programs/factory";
import { ChainTransactionError } from "@/lib/solana/tx";
import { useLaunchpad } from "./launchpad-context";

type LaunchAccount = {
  mint: PublicKey;
  backingCtoken: PublicKey;
  teamRecipient: PublicKey;
  wiredMask: number;
  requiredMask: number;
};

type FactoryConfigAccount = {
  usdcMint: PublicKey;
  protocolRevenueWallet: PublicKey;
  registry: PublicKey;
  dao: PublicKey;
};

type WireFailure = { step: WireStepId; message: string };

export function useWireLaunch() {
  const { state } = useLaunchpad();
  const wallet = useAnchorWallet();
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const [steps, setSteps] = useState<WireChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<WireFailure | null>(null);

  const load = useCallback(
    async (failed: WireFailure | null) => {
      if (state.launchId == null || !state.launchedMint) {
        setLoading(false);
        setError("This launch has no id yet.");
        return;
      }
      try {
        const reader = walletRef.current ?? readOnlyWallet(publicKey);
        const provider = new AnchorProvider(connection, reader, { commitment: "confirmed" });
        const client = createTransmuterClient(provider);
        const launchAccount = (await client.factory.account.launch.fetch(launchPda(state.launchId))) as LaunchAccount;
        const factoryAccount = (await client.factory.account.factoryConfig.fetch(factoryPda())) as FactoryConfigAccount;
        const wireLaunch = toWireLaunch(state.launchId, publicKey ?? PublicKey.default, launchAccount, factoryAccount);
        const treasury = prepareWireStep("treasuryAta", wireLaunch).accounts.ata;
        const treasuryInfo = await connection.getAccountInfo(treasury, "confirmed");
        if ((Number(launchAccount.wiredMask) & WIRE_EOL) !== 0) {
          const storage = browserSession();
          if (storage) clearMintSecret(storage, state.launchId);
        }
        setSteps(
          buildWireChecklist({
            requiredMask: Number(launchAccount.requiredMask),
            wiredMask: Number(launchAccount.wiredMask),
            treasuryAtaExists: treasuryInfo !== null,
            failedStep: failed?.step,
            failure: failed?.message,
          }),
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read the launch.");
      } finally {
        setLoading(false);
      }
    },
    [connection, publicKey, state.launchId, state.launchedMint],
  );

  useEffect(() => {
    void load(failure);
  }, [failure, load]);

  const runNext = useCallback(async () => {
    const signer = walletRef.current;
    if (!signer || !publicKey || state.launchId == null) {
      setError("Connect a wallet to sign the next wiring transaction.");
      return;
    }
    const next = nextWireStep(steps);
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const provider = new AnchorProvider(connection, signer, { commitment: "confirmed" });
      const client = createTransmuterClient(provider);
      const launchAccount = (await client.factory.account.launch.fetch(launchPda(state.launchId))) as LaunchAccount;
      const factoryAccount = (await client.factory.account.factoryConfig.fetch(factoryPda())) as FactoryConfigAccount;
      const wireLaunch = toWireLaunch(state.launchId, publicKey, launchAccount, factoryAccount);
      const storage = browserSession();
      const secret = storage ? loadMintSecret(storage, state.launchId) : null;
      const prepared = prepareWireStep(next.id, wireLaunch, {
        mintSigner: secret ? Keypair.fromSecretKey(secret) : undefined,
      });
      const confirmed = await submitWireStep({
        step: prepared,
        factory: client.factory as unknown as FactoryWireClient,
        connection,
        signer,
      });
      if (next.id === "eol" && storage) clearMintSecret(storage, state.launchId);
      setExplorerUrl(confirmed.explorerUrl);
      setFailure(null);
      await load(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wiring failed";
      setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
      setFailure({ step: next.id, message });
    } finally {
      setBusy(false);
    }
  }, [connection, load, publicKey, state.launchId, steps]);

  const next = nextWireStep(steps);
  return {
    steps,
    loading,
    busy,
    error,
    explorerUrl,
    connected,
    saleOpen: steps.length > 0 && next === null && !error,
    next,
    runNext,
  };
}

function toWireLaunch(
  launchId: number,
  cranker: PublicKey,
  launch: LaunchAccount,
  factory: FactoryConfigAccount,
): WireLaunch {
  return {
    launchId,
    mint: launch.mint,
    backingCtoken: launch.backingCtoken,
    teamRecipient: launch.teamRecipient,
    requiredMask: Number(launch.requiredMask),
    cranker,
    usdcMint: factory.usdcMint,
    protocolRevenueWallet: factory.protocolRevenueWallet,
    registry: factory.registry,
    dao: factory.dao,
  };
}

function readOnlyWallet(publicKey: PublicKey | null): AnchorProvider["wallet"] {
  const key = publicKey ?? PublicKey.default;
  return {
    publicKey: key,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs,
  };
}
