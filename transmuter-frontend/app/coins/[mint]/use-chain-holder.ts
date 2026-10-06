"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { settleChainRead } from "@/lib/catalog/chain-read";
import { startChainPoll } from "@/lib/catalog/chain-poll";
import { readHolder, type HolderView } from "@/lib/catalog/read-holder";
import { holderReaders } from "@/lib/catalog/read-holder-rpc";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { getBatchedConnection } from "@/lib/solana/batch-connection";

const LIVE_MS = 30_000;

export function useChainHolder(mint: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [view, setView] = useState<HolderView | null>(null);
  const [trackedMint, setTrackedMint] = useState(mint);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  if (trackedMint !== mint) {
    setTrackedMint(mint);
    setView(null);
  }

  useEffect(() => {
    let mintKey: PublicKey;
    try {
      mintKey = new PublicKey(mint);
    } catch {
      return;
    }

    let active = true;
    const stop = startChainPoll(async () => {
      const request = ++latest.current;
      const batched = getBatchedConnection(connection);
      const provider = createReadonlyProvider(batched, publicKey ?? PublicKey.default);
      const client = createTransmuterClient(provider);
      let next: HolderView | null;
      try {
        next = await readHolder(holderReaders(client, batched), mintKey, publicKey, Math.floor(Date.now() / 1000));
      } catch (error) {
        if (active && request === latest.current) {
          setView((current) => settleChainRead(current, null, request, latest.current));
        }
        throw error;
      }
      if (!active || request !== latest.current) return;
      setView((current) => settleChainRead(current, next, request, latest.current));
    }, LIVE_MS);

    return () => {
      active = false;
      latest.current += 1;
      stop();
    };
  }, [connection, mint, publicKey, tick]);

  return { view, reload };
}
