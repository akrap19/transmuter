"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { settleChainRead } from "@/lib/catalog/chain-read";
import { readPostSale } from "@/lib/catalog/read-post-sale";
import { postSaleReaders } from "@/lib/catalog/read-post-sale-rpc";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";

const LIVE_MS = 30_000;
const FIRST_DELAY_MS = 8_000;

export function useChainPostSale(mint: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [view, setView] = useState<Awaited<ReturnType<typeof readPostSale>>>(null);
  const [settled, setSettled] = useState(false);
  const [trackedMint, setTrackedMint] = useState(mint);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const opened = useRef(false);
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
    const load = () => {
      const request = ++latest.current;
      const provider = createReadonlyProvider(connection, publicKey ?? PublicKey.default);
      const client = createTransmuterClient(provider);
      void readPostSale(postSaleReaders(client, connection), mintKey, publicKey, Math.floor(Date.now() / 1000))
        .then((next) => {
          if (!active) return;
          setView((current) => settleChainRead(current, next, request, latest.current));
          if (request === latest.current) setSettled(true);
        })
        .catch(() => {
          if (!active) return;
          setView((current) => settleChainRead(current, null, request, latest.current));
        });
    };

    const wait = opened.current ? 0 : FIRST_DELAY_MS;
    opened.current = true;
    const start = setTimeout(load, wait);
    const id = setInterval(load, LIVE_MS);
    return () => {
      active = false;
      latest.current += 1;
      clearTimeout(start);
      clearInterval(id);
    };
  }, [connection, mint, publicKey, tick]);

  return { view, settled, reload };
}
