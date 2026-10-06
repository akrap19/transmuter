"use client";

import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { useOwnedBalances } from "@/components/catalog/use-owned-balances";
import { getPortfolio } from "@/lib/catalog/client";
import { formatUsd } from "@/lib/catalog/format";
import { MOCK_PREVIEW_WALLET } from "@/lib/catalog/mock";
import type { PortfolioSnapshot } from "@/lib/catalog/types";
import { routes } from "@/lib/routes";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { ClaimablesTable, VotesTable } from "./portfolio-claims";
import { HoldingsTable, StakesTable } from "./portfolio-positions";
import { usePortfolio } from "./use-portfolio";

type PortfolioViewProps = {
  preview: boolean;
};

export function PortfolioView({ preview }: PortfolioViewProps) {
  if (preview) {
    return <Dashboard snapshot={getPortfolio(MOCK_PREVIEW_WALLET)} notice />;
  }

  return (
    <WalletGate
      title="Connect to open the dashboard"
      body="Holdings, stakes, claimables, and open votes are keyed by wallet. There is no login."
      previewHref={`${routes.portfolio}?preview=1`}
    >
      {(wallet) => <ConnectedDashboard wallet={wallet} />}
    </WalletGate>
  );
}

function ConnectedDashboard({ wallet }: { wallet: string }) {
  const accounts = useOwnedBalances(wallet);
  const portfolio = usePortfolio(wallet, accounts);

  if (portfolio.loading) return <p className="coin-lede">Loading holdings, stakes, and claims…</p>;
  if (portfolio.error || !portfolio.snapshot) {
    return (
      <CatalogEmpty
        title="Index unavailable"
        body="Holdings come from the catalog API and this wallet's token accounts. Stakes, claims, and votes are read from chain once the index responds."
      />
    );
  }

  return <Dashboard snapshot={portfolio.snapshot} />;
}

function Dashboard({ snapshot, notice = false }: { snapshot: PortfolioSnapshot; notice?: boolean }) {
  return (
    <>
      {notice ? <CatalogBanner /> : null}
      <CoinStats
        items={[
          { label: "Holdings", value: formatUsd(snapshot.totals.holdingsUsd) },
          { label: "Stakes", value: snapshot.totals.stakedCount },
          { label: "Claimable", value: snapshot.totals.claimableCount },
          { label: "Open votes", value: snapshot.totals.openVoteCount },
        ]}
      />
      <HoldingsTable rows={snapshot.holdings} />
      <StakesTable rows={snapshot.stakes} />
      <ClaimablesTable rows={snapshot.claimables} />
      <VotesTable rows={snapshot.openVotes} />
    </>
  );
}
