"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { loadLivePortfolio } from "@/lib/catalog/load-portfolio";
import { readHolder } from "@/lib/catalog/read-holder";
import { holderReaders } from "@/lib/catalog/read-holder-rpc";
import type { PortfolioSnapshot, TokenAccountBalance } from "@/lib/catalog/types";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { getBatchedConnection } from "@/lib/solana/batch-connection";

export function usePortfolio(wallet: string, accounts: TokenAccountBalance[] | null) {
  const { connection } = useConnection();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accounts) return;

    let owner: PublicKey;
    try {
      owner = new PublicKey(wallet);
    } catch {
      setError(true);
      return;
    }

    let cancelled = false;
    setSnapshot(null);
    setError(false);

    const batched = getBatchedConnection(connection);
    const provider = createReadonlyProvider(batched, owner);
    const client = createTransmuterClient(provider);
    const readers = holderReaders(client, batched);
    const now = Math.floor(Date.now() / 1000);

    void loadLivePortfolio({
      wallet,
      accounts,
      now,
      readPosition: async (coin) => {
        const view = await readHolder(readers, new PublicKey(coin.mint), owner, now);
        if (!view) return null;
        return {
          stake: view.stake,
          vesting: view.vesting,
          escrow: view.escrow,
          redeem: view.redeem,
          votes: view.votes,
        };
      },
    }).then((loaded) => {
      if (cancelled) return;
      if (!loaded.ok) {
        setError(true);
        return;
      }
      setSnapshot(loaded.snapshot);
    });

    return () => {
      cancelled = true;
    };
  }, [accounts, connection, wallet]);

  return {
    snapshot,
    loading: !error && (accounts == null || snapshot == null),
    error,
  };
}
