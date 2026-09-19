import { MOCK_ACCOUNTS, MOCK_CATALOG, MOCK_PORTFOLIOS } from "./mock";
import { createdCoins, heldCoins } from "./my-coins";
import { buildPortfolio } from "./portfolio";
import { queryCoins } from "./query";
import type { CoinQuery, PortfolioInput } from "./types";

const EMPTY_PORTFOLIO: PortfolioInput = {
  holdings: [],
  stakes: [],
  claimables: [],
  openVotes: [],
};

export function listCoins(query: CoinQuery) {
  return queryCoins(MOCK_CATALOG, query);
}

export function listCreated(wallet: string) {
  return createdCoins(MOCK_CATALOG, wallet);
}

export function listHeld(wallet: string) {
  return heldCoins(MOCK_CATALOG, MOCK_ACCOUNTS[wallet] ?? []);
}

export function getPortfolio(wallet: string) {
  return buildPortfolio(MOCK_PORTFOLIOS[wallet] ?? EMPTY_PORTFOLIO);
}
