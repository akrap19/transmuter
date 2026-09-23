"use client";

import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getPortfolio } from "@/lib/catalog/client";
import { formatUsd } from "@/lib/catalog/format";
import { MOCK_PREVIEW_WALLET } from "@/lib/catalog/mock";
import type { TokenAccountBalance } from "@/lib/catalog/types";
import { routes } from "@/lib/routes";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { useOwnedBalances } from "@/components/catalog/use-owned-balances";
import { ClaimablesTable, VotesTable } from "./portfolio-claims";
import { HoldingsTable, StakesTable } from "./portfolio-positions";

type PortfolioViewProps = {
  preview: boolean;
};

export function PortfolioView({ preview }: PortfolioViewProps) {
  if (preview) {
    return <Dashboard wallet={MOCK_PREVIEW_WALLET} />;
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
  return <Dashboard wallet={wallet} accounts={accounts ?? []} />;
}

function Dashboard({ wallet, accounts }: { wallet: string; accounts?: TokenAccountBalance[] }) {
  const snapshot = getPortfolio(wallet, accounts);

  return (
    <>
      <CatalogBanner />
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
