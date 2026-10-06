"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { settleChainRead } from "@/lib/catalog/chain-read";
import { startChainPoll } from "@/lib/catalog/chain-poll";
import { readPostSale } from "@/lib/catalog/read-post-sale";
import { postSaleReaders } from "@/lib/catalog/read-post-sale-rpc";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { getBatchedConnection } from "@/lib/solana/batch-connection";

const LIVE_MS = 30_000;

export function useChainPostSale(mint: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [view, setView] = useState<Awaited<ReturnType<typeof readPostSale>>>(null);
  const [settled, setSettled] = useState(false);
  const [trackedMint, setTrackedMint] = useState(mint);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  if (trackedMint !== mint) {
    setTrackedMint(mint);
    setView(null);
    setSettled(false);
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
      let next: Awaited<ReturnType<typeof readPostSale>>;
      try {
        next = await readPostSale(postSaleReaders(client, batched), mintKey, publicKey, Math.floor(Date.now() / 1000));
      } catch (error) {
        if (active && request === latest.current) {
          setView((current) => settleChainRead(current, null, request, latest.current));
        }
        throw error;
      }
      if (!active || request !== latest.current) return;
      setView((current) => settleChainRead(current, next, request, latest.current));
      setSettled(true);
    }, LIVE_MS);

    return () => {
      active = false;
      latest.current += 1;
      stop();
    };
  }, [connection, mint, publicKey, tick]);

  return { view, settled, reload };
}
