import type { CoinListItem, HeldAccount, HeldCoin } from "./types.ts";

export function parseHeldAccounts(search: URLSearchParams): HeldAccount[] {
  const mints = search.getAll("mint");
  const amounts = search.getAll("amount");
  return mints.map((mint, index) => ({
    mint,
    amount: Number(amounts[index] ?? 0),
  }));
}

export function heldCoins(catalog: CoinListItem[], accounts: HeldAccount[]): HeldCoin[] {
  const known = new Map(catalog.map((item) => [item.mint, item]));
  return accounts.flatMap((account) => {
    if (!(account.amount > 0)) return [];
    const coin = known.get(account.mint);
    if (!coin) return [];
    return [{ ...coin, amount: account.amount }];
  });
}

export function createdCoins(catalog: CoinListItem[], wallet: string): CoinListItem[] {
  return catalog.filter((item) => item.creator === wallet);
}
