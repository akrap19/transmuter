"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { readHolder, type HolderView } from "@/lib/catalog/read-holder";
import { holderReaders } from "@/lib/catalog/read-holder-rpc";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";

const LIVE_MS = 12_000;

export function useChainHolder(mint: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [view, setView] = useState<HolderView | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let mintKey: PublicKey;
    try {
      mintKey = new PublicKey(mint);
    } catch {
      return;
    }

    let cancelled = false;
    const load = () => {
      const provider = createReadonlyProvider(connection, publicKey ?? PublicKey.default);
      const client = createTransmuterClient(provider);
      void readHolder(holderReaders(client, connection), mintKey, publicKey, Math.floor(Date.now() / 1000))
        .then((next) => {
          if (!cancelled) setView(next);
        })
        .catch(() => {
          if (!cancelled) setView(null);
        });
    };

    load();
    const id = setInterval(load, LIVE_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection, mint, publicKey, tick]);

  return { view, reload };
}
