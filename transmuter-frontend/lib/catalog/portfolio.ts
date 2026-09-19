import type { PortfolioInput, PortfolioSnapshot } from "./types";

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
