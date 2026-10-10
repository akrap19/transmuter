import type { Metadata } from "next";
import "@/app/brand/wallet.css";
import { parsePreviewFlag, searchParamsFromRecord } from "@/lib/catalog/search-params";
import { routes } from "@/lib/routes";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { PortfolioView } from "./portfolio-view";

export const metadata: Metadata = marketingPageMetadata({
  path: routes.portfolio,
  title: "Portfolio",
  description: "Holdings, stakes, claimables, and open votes for the connected wallet.",
  index: false,
});

type PortfolioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const preview = parsePreviewFlag(searchParamsFromRecord(await searchParams));

  return (
    <main className="wallet-page">
      <section className="subhero section-shell">
        <p className="eyebrow">TRANSMUTER · DASHBOARD</p>
        <h1>Portfolio</h1>
        <p>Aggregate holdings, staking weight, vesting/redemption/escrow claims, and votes still open.</p>
      </section>
      <section className="wallet-section section-shell">
        <PortfolioView preview={preview} />
      </section>
    </main>
  );
}
