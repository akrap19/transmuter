"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserSession, clearMintSecret, clearPendingWire, loadMintSecret } from "@/lib/launchpad/mint-secret";
import { buildWireUnits, submitWireBatch, submitWireStep, type FactoryWireClient } from "@/lib/launchpad/submit-wire";
import { planWireBatches } from "@/lib/launchpad/wire-batches";
import { prepareWireStep, type WireLaunch } from "@/lib/launchpad/wire-accounts";
import {
  WIRE_EOL,
  buildWireChecklist,
  nextWireStep,
  wiringComplete,
  type WireChecklistItem,
  type WireStepId,
} from "@/lib/launchpad/wire-plan";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { factoryPda, launchPda } from "@/lib/solana/programs/factory";
import { ChainTransactionError } from "@/lib/solana/tx";
import { toastError, toastSuccess } from "@/lib/toast";
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
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [activeStepId, setActiveStepId] = useState<WireStepId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<WireFailure | null>(null);

  const readWiring = useCallback(async (): Promise<WiringRead | null> => {
    if (state.launchId == null || !state.launchedMint) return null;
    const reader = walletRef.current ?? readOnlyWallet(publicKey);
    const provider = new AnchorProvider(connection, reader, { commitment: "confirmed" });
    const client = createTransmuterClient(provider);
    const launchAccount = (await client.factory.account.launch.fetch(launchPda(state.launchId))) as LaunchAccount;
    const factoryAccount = (await client.factory.account.factoryConfig.fetch(factoryPda())) as FactoryConfigAccount;
    const wireLaunch = toWireLaunch(state.launchId, publicKey ?? PublicKey.default, launchAccount, factoryAccount);
    const treasury = prepareWireStep("treasuryAta", wireLaunch).accounts.ata;
    const treasuryInfo = await connection.getAccountInfo(treasury, "confirmed");
    return {
      client,
      wireLaunch,
      requiredMask: Number(launchAccount.requiredMask),
      wiredMask: Number(launchAccount.wiredMask),
      treasuryAtaExists: treasuryInfo !== null,
    };
  }, [connection, publicKey, state.launchId, state.launchedMint]);

  const load = useCallback(
    async (failed: WireFailure | null) => {
      if (state.launchId == null || !state.launchedMint) {
        setLoading(false);
        return;
      }
      try {
        const read = await readWiring();
        if (!read) {
          setLoading(false);
          return;
        }
        if ((read.wiredMask & WIRE_EOL) !== 0) {
          const storage = browserSession();
          if (storage) clearMintSecret(storage, state.launchId);
        }
        const checklist = buildWireChecklist({
          requiredMask: read.requiredMask,
          wiredMask: read.wiredMask,
          treasuryAtaExists: read.treasuryAtaExists,
          failedStep: failed?.step,
          failure: failed?.message,
        });
        if (wiringComplete(checklist)) {
          const storage = browserSession();
          if (storage) clearPendingWire(storage);
        }
        setSteps(checklist);
        setProgress({ done: checklist.filter((step) => step.state === "done").length, total: checklist.length });
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not read the launch.";
        toastError(message);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [readWiring, state.launchId, state.launchedMint],
  );

  useEffect(() => {
    void load(failure);
  }, [failure, load]);

  const runNext = useCallback(async () => {
    const signer = walletRef.current;
    if (!signer || !publicKey || state.launchId == null) {
      const message = "Connect a wallet to sign the next wiring transaction.";
      toastError(message);
      setError(message);
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
      toastSuccess(`${next.label} confirmed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wiring failed";
      toastError(message);
      setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
      setFailure({ step: next.id, message });
    } finally {
      setBusy(false);
    }
  }, [connection, load, publicKey, state.launchId, steps]);

  const runAll = useCallback(async () => {
    const signer = walletRef.current;
    if (!signer || !publicKey || state.launchId == null) {
      const message = "Connect a wallet to sign the wiring transactions.";
      toastError(message);
      setError(message);
      return;
    }
    setRunning(true);
    setBusy(true);
    setError(null);

    let stuckStep: WireStepId | null = null;
    let attempts = 0;

    try {
      for (let guard = 0; guard < MAX_WIRE_ITERATIONS; guard++) {
        const read = await readWiring();
        if (!read) break;

        const remaining = buildWireChecklist({
          requiredMask: read.requiredMask,
          wiredMask: read.wiredMask,
          treasuryAtaExists: read.treasuryAtaExists,
        }).filter((step) => step.state !== "done");

        if (remaining.length === 0) {
          setFailure(null);
          break;
        }

        const storage = browserSession();
        const secret = storage ? loadMintSecret(storage, state.launchId) : null;
        const prepared = remaining.map((step) =>
          prepareWireStep(step.id, read.wireLaunch, {
            mintSigner: secret ? Keypair.fromSecretKey(secret) : undefined,
          }),
        );
        const units = await buildWireUnits(prepared, read.client.factory as unknown as FactoryWireClient);
        const batch = planWireBatches(units, publicKey)[0];
        setActiveStepId(batch.stepIds[0]);
        if (batch.stepIds[0] !== stuckStep) {
          stuckStep = batch.stepIds[0];
          attempts = 0;
        }

        try {
          const confirmed = await submitWireBatch({ batch, feePayer: publicKey, connection, signer });
          setExplorerUrl(confirmed.explorerUrl);
          setFailure(null);
          stuckStep = null;
          attempts = 0;
          if (batch.stepIds.includes("eol") && storage) clearMintSecret(storage, state.launchId);
          await load(null);
        } catch (err) {
          attempts += 1;
          const message = err instanceof Error ? err.message : "Wiring failed";
          setExplorerUrl(err instanceof ChainTransactionError ? (err.explorerUrl ?? null) : null);
          const rejected = /cancelled in the wallet|user rejected|rejected the request/i.test(message);
          if (rejected || attempts >= MAX_BATCH_RETRIES) {
            setFailure({ step: batch.stepIds[0], message });
            setError(message);
            toastError(message);
            break;
          }
          await delay(RETRY_DELAY_MS);
        }
      }
    } finally {
      setRunning(false);
      setBusy(false);
      setActiveStepId(null);
    }
  }, [connection, load, publicKey, readWiring, state.launchId]);

  const next = nextWireStep(steps);
  return {
    steps,
    loading,
    busy,
    running,
    progress,
    activeStepId,
    error,
    explorerUrl,
    connected,
    saleOpen: steps.length > 0 && next === null && !error,
    next,
    runNext,
    runAll,
  };
}

const MAX_WIRE_ITERATIONS = 40;
const MAX_BATCH_RETRIES = 3;
const RETRY_DELAY_MS = 700;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WiringRead = {
  client: ReturnType<typeof createTransmuterClient>;
  wireLaunch: WireLaunch;
  requiredMask: number;
  wiredMask: number;
  treasuryAtaExists: boolean;
};

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
