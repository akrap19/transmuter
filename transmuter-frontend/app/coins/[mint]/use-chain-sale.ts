"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { depositReadMatches, settleChainRead } from "@/lib/catalog/chain-read";
import { startChainPoll } from "@/lib/catalog/chain-poll";
import type { LiveSaleView } from "@/lib/catalog/live-sale";
import { readLiveSale } from "@/lib/catalog/read-live-sale";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { getBatchedConnection } from "@/lib/solana/batch-connection";
import { readersFrom } from "@/lib/catalog/read-live-sale-rpc";

const LIVE_SALE_MS = 30_000;

export function useChainSale(mint: string): { live: LiveSaleView | null; depositKnown: boolean; reload: () => void } {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [live, setLive] = useState<LiveSaleView | null>(null);
  const [readWallet, setReadWallet] = useState<string | null>(null);
  const [trackedMint, setTrackedMint] = useState(mint);
  const [tick, setTick] = useState(0);
  if (trackedMint !== mint) {
    setTrackedMint(mint);
    setLive(null);
    setReadWallet(null);
  }
  const latest = useRef(0);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  const wallet = publicKey?.toBase58() ?? null;

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
      const key = publicKey?.toBase58() ?? null;
      const provider = createReadonlyProvider(getBatchedConnection(connection), publicKey ?? PublicKey.default);
      const client = createTransmuterClient(provider);
      let view: LiveSaleView | null;
      try {
        view = await readLiveSale(readersFrom(client), mintKey, publicKey, Math.floor(Date.now() / 1000));
      } catch (error) {
        if (active && request === latest.current) {
          setLive((current) => settleChainRead(current, null, request, latest.current));
        }
        throw error;
      }
      if (!active || request !== latest.current) return;
      setLive((current) => settleChainRead(current, view, request, latest.current));
      if (view) setReadWallet(key);
    }, LIVE_SALE_MS);

    return () => {
      active = false;
      latest.current += 1;
      stop();
    };
  }, [connection, mint, publicKey, tick]);

  return { live, depositKnown: depositReadMatches(wallet, readWallet), reload };
}
