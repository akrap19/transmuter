import type { Metadata } from "next";
import Link from "next/link";
import "@/app/brand/coin-detail.css";
import { ChartsPanel } from "@/app/coins/[mint]/charts-panel";
import { EscrowPanel } from "@/app/coins/[mint]/escrow-panel";
import { GovernancePanel } from "@/app/coins/[mint]/governance-panel";
import { OverviewPanel } from "@/app/coins/[mint]/overview-panel";
import { RedeemPanel } from "@/app/coins/[mint]/redeem-panel";
import { SalePanel } from "@/app/coins/[mint]/sale-panel";
import { StakePanel } from "@/app/coins/[mint]/stake-panel";
import { TradePanel } from "@/app/coins/[mint]/trade-panel";
import { TreasuryPanel } from "@/app/coins/[mint]/treasury-panel";
import { VestingPanel } from "@/app/coins/[mint]/vesting-panel";
import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { getCoinDetail } from "@/lib/catalog/client";
import { routes } from "@/lib/routes";

type CoinPageProps = {
  params: Promise<{ mint: string }>;
};

export async function generateMetadata({ params }: CoinPageProps): Promise<Metadata> {
  const { mint } = await params;
  const coin = getCoinDetail(mint);
  return {
    title: coin ? `${coin.name} (${coin.symbol})` : mint,
    description: coin
      ? `${coin.name} on Transmuter — Factory-registered EOL launch.`
      : `Transmuter launch ${mint}`,
  };
}

export default async function CoinPage({ params }: CoinPageProps) {
  const { mint } = await params;
  const coin = getCoinDetail(mint);

  return (
    <main className="coin-page">
      {coin ? (
        <>
          <OverviewPanel coin={coin} />
          <section className="coin-body section-shell">
            <CatalogBanner />
            <SalePanel coin={coin} />
            <TradePanel coin={coin} />
            <ChartsPanel points={coin.chart} />
            <StakePanel coin={coin} />
            <GovernancePanel coin={coin} />
            <RedeemPanel coin={coin} />
            <VestingPanel coin={coin} />
            <EscrowPanel coin={coin} />
            <TreasuryPanel coin={coin} />
          </section>
        </>
      ) : (
        <>
          <section className="subhero section-shell coin-hero">
            <Link href={routes.coins} className="coin-back">
              All coins
            </Link>
            <p className="eyebrow">EXPLORE · TOKEN</p>
            <h1>Mint not found</h1>
            <p>This address is not in the sample index yet. VOIDED and live launches both resolve here once indexed.</p>
          </section>
          <section className="coin-body section-shell">
            <CatalogEmpty
              title={mint}
              body="After the Factory registry is indexed, every launch (including VOIDED) will resolve here."
            >
              <Link href={routes.coins} className="button button-primary">
                Back to Explore
              </Link>
            </CatalogEmpty>
          </section>
        </>
      )}
    </main>
  );
}
