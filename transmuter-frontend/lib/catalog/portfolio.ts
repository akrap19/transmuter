import type { HeldCoin, Holding, PortfolioInput, PortfolioSnapshot } from "./types";

export function holdingsFromCoins(held: HeldCoin[]): Holding[] {
  return held.map((coin) => ({
    mint: coin.mint,
    name: coin.name,
    symbol: coin.symbol,
    amount: coin.amount,
    valueUsd: coin.priceUsd == null ? null : coin.amount * coin.priceUsd,
  }));
}

export function buildPortfolio(input: PortfolioInput): PortfolioSnapshot {
  const holdingsUsd = input.holdings.reduce((sum, holding) => sum + (holding.valueUsd ?? 0), 0);

  return {
    ...input,
    totals: {
      holdingsUsd,
      stakedCount: input.stakes.length,
      claimableCount: input.claimables.length,
      openVoteCount: input.openVotes.length,
    },
  };
}
