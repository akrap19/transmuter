"use client";

import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getPortfolio } from "@/lib/catalog/client";
import { formatUsd } from "@/lib/catalog/format";
import { MOCK_PREVIEW_WALLET } from "@/lib/catalog/mock";
import { ClaimablesTable, VotesTable } from "./portfolio-claims";
import { HoldingsTable, StakesTable } from "./portfolio-positions";

function samplePortfolio(wallet: string) {
  const mine = getPortfolio(wallet);
  if (mine.holdings.length + mine.stakes.length + mine.claimables.length + mine.openVotes.length > 0) return mine;
  return getPortfolio(MOCK_PREVIEW_WALLET);
}

export function PortfolioView() {
  return (
    <WalletGate
      title="Connect to open the dashboard"
      body="Holdings, stakes, claimables, and open votes are keyed by wallet. There is no login."
    >
      {(wallet) => {
        const snapshot = samplePortfolio(wallet);
        return (
          <>
            <CatalogBanner />
            <div className="catalog-stats">
              <article>
                <span>Holdings</span>
                <strong>{formatUsd(snapshot.totals.holdingsUsd)}</strong>
              </article>
              <article>
                <span>Stakes</span>
                <strong>{snapshot.totals.stakedCount}</strong>
              </article>
              <article>
                <span>Claimable</span>
                <strong>{snapshot.totals.claimableCount}</strong>
              </article>
              <article>
                <span>Open votes</span>
                <strong>{snapshot.totals.openVoteCount}</strong>
              </article>
            </div>
            <HoldingsTable rows={snapshot.holdings} />
            <StakesTable rows={snapshot.stakes} />
            <ClaimablesTable rows={snapshot.claimables} />
            <VotesTable rows={snapshot.openVotes} />
          </>
        );
      }}
    </WalletGate>
  );
}
