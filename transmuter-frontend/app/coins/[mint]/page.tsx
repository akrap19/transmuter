import type { Metadata } from "next";
import { ChartsPanel } from "@/app/coins/[mint]/charts-panel";
import { GovernancePanel } from "@/app/coins/[mint]/governance-panel";
import { OverviewPanel } from "@/app/coins/[mint]/overview-panel";
import { SalePanel } from "@/app/coins/[mint]/sale-panel";
import { StakePanel } from "@/app/coins/[mint]/stake-panel";
import { TradePanel } from "@/app/coins/[mint]/trade-panel";
import { TreasuryPanel } from "@/app/coins/[mint]/treasury-panel";
import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { SiteFooter, SiteNav } from "@/components/transmuter/site-chrome";
import { Wrap } from "@/components/transmuter/wrap";
import { getCoinDetail } from "@/lib/catalog/client";
import { routes } from "@/lib/routes";
import Link from "next/link";

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
    <div className="page-docs page-catalog">
      <SiteNav />
      <Wrap>
        <CatalogBanner />
        {coin ? (
          <>
            <OverviewPanel coin={coin} />
            <SalePanel coin={coin} />
            <TradePanel coin={coin} />
            <ChartsPanel points={coin.chart} />
            <StakePanel coin={coin} />
            <GovernancePanel coin={coin} />
            <TreasuryPanel coin={coin} />
          </>
        ) : (
          <CatalogEmpty
            title={mint}
            body="Mint not found in the sample index. After the Factory registry is indexed, every launch (including VOIDED) will resolve here."
          >
            <Link href={routes.coins} className="btn btn-gold">
              Back to Explore
            </Link>
          </CatalogEmpty>
        )}
      </Wrap>
      <SiteFooter />
    </div>
  );
}
