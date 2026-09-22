import type { TokenAccountBalance } from "./types";

type ParsedTokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: { uiAmount?: number | null };
        };
      };
    };
  };
};

export function tokenBalancesFromParsedAccounts(accounts: ParsedTokenAccount[]): TokenAccountBalance[] {
  return accounts.flatMap((entry) => {
    const info = entry.account?.data?.parsed?.info;
    const mint = info?.mint;
    const amount = info?.tokenAmount?.uiAmount;
    if (!mint || amount == null || amount <= 0) return [];
    return [{ mint, amount }];
  });
}
