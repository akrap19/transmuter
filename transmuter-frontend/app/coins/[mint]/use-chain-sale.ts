"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import type { LiveSaleView } from "@/lib/catalog/live-sale";
import { readLiveSale } from "@/lib/catalog/read-live-sale";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { readersFrom } from "@/lib/catalog/read-live-sale-rpc";

const LIVE_SALE_MS = 12_000;

export function useChainSale(mint: string): { live: LiveSaleView | null; reload: () => void } {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [live, setLive] = useState<LiveSaleView | null>(null);
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
      void readLiveSale(readersFrom(client), mintKey, publicKey, Math.floor(Date.now() / 1000))
        .then((view) => {
          if (!cancelled) setLive(view);
        })
        .catch(() => {
          if (!cancelled) setLive(null);
        });
    };

    load();
    const id = setInterval(load, LIVE_SALE_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection, mint, publicKey, tick]);

  return { live, reload };
}
