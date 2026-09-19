import type { Metadata } from "next";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { SiteFooter, SiteNav } from "@/components/transmuter/site-chrome";
import { Wrap } from "@/components/transmuter/wrap";
import { PortfolioView } from "./portfolio-view";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Holdings, stakes, claimables, and open votes for the connected wallet.",
};

export default function PortfolioPage() {
  return (
    <div className="page-docs page-catalog">
      <SiteNav />
      <Wrap>
        <CatalogHeader
          eyebrow="TRANSMUTER · DASHBOARD"
          title={
            <>
              <span className="g">PORTFOLIO</span>
            </>
          }
          subtitle="Aggregate holdings, staking weight, vesting/redemption/escrow claims, and votes still open."
        />
        <PortfolioView />
      </Wrap>
      <SiteFooter />
    </div>
  );
}
