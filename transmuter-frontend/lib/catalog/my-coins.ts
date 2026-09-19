import type { CoinListItem, HeldCoin, TokenAccountBalance } from "./types";

export function createdCoins(catalog: CoinListItem[], wallet: string): CoinListItem[] {
  return catalog.filter((item) => item.creator === wallet);
}

export function heldCoins(catalog: CoinListItem[], accounts: TokenAccountBalance[]): HeldCoin[] {
  const known = new Map(catalog.map((item) => [item.mint, item]));

  return accounts.flatMap((account) => {
    if (account.amount <= 0) return [];
    const coin = known.get(account.mint);
    if (!coin) return [];
    return [{ ...coin, amount: account.amount }];
  });
}
