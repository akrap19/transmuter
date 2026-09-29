"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { readPostSale } from "@/lib/catalog/read-post-sale";
import { postSaleReaders } from "@/lib/catalog/read-post-sale-rpc";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";

const LIVE_MS = 12_000;

export function useChainPostSale(mint: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [view, setView] = useState<Awaited<ReturnType<typeof readPostSale>>>(null);
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
      void readPostSale(postSaleReaders(client, connection), mintKey, publicKey, Math.floor(Date.now() / 1000))
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
