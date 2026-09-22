"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { tokenBalancesFromParsedAccounts } from "@/lib/catalog/token-accounts";
import type { TokenAccountBalance } from "@/lib/catalog/types";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@/lib/solana/spl-token";

export function useOwnedBalances(wallet: string | null) {
  const { connection } = useConnection();
  const [accounts, setAccounts] = useState<TokenAccountBalance[] | null>(null);

  useEffect(() => {
    if (!wallet) {
      setAccounts(null);
      return;
    }

    let owner: PublicKey;
    try {
      owner = new PublicKey(wallet);
    } catch {
      setAccounts([]);
      return;
    }

    let cancelled = false;

    void Promise.all([
      connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
      connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    ])
      .then(([token2022, classic]) => {
        if (!cancelled) {
          setAccounts(tokenBalancesFromParsedAccounts([...token2022.value, ...classic.value]));
        }
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, wallet]);

  return accounts;
}
