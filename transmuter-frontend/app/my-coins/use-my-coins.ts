"use client";

import { useEffect, useState } from "react";
import { fetchCoinList, fetchCreatedCoins } from "@/lib/catalog/api";
import { heldCoins } from "@/lib/catalog/my-coins";
import type { CoinListItem, HeldCoin, TokenAccountBalance } from "@/lib/catalog/types";

export function useMyCoins(wallet: string, accounts: TokenAccountBalance[] | null) {
  const [created, setCreated] = useState<CoinListItem[] | null>(null);
  const [catalog, setCatalog] = useState<CoinListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCreated(null);
    setCatalog(null);
    setError(false);

    void Promise.all([fetchCreatedCoins(wallet), fetchCoinList({})]).then(([createdResult, listResult]) => {
      if (cancelled) return;
      if (!createdResult.ok || !listResult.ok) {
        setError(true);
        return;
      }
      setCreated(createdResult.data);
      setCatalog(listResult.data.items);
    });

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const held: HeldCoin[] | null = catalog && accounts ? heldCoins(catalog, accounts) : null;

  return {
    created: created ?? [],
    held: held ?? [],
    loading: !error && (created == null || held == null),
    error,
  };
}
