import type { Metadata } from "next";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { SiteFooter, SiteNav } from "@/components/transmuter/site-chrome";
import { Wrap } from "@/components/transmuter/wrap";
import { MyCoinsView } from "./my-coins-view";

export const metadata: Metadata = {
  title: "My Coins",
  description: "Launches you created on Transmuter and EOL tokens you hold.",
};

export default function MyCoinsPage() {
  return (
    <div className="page-docs page-catalog">
      <SiteNav />
      <Wrap>
        <CatalogHeader
          eyebrow="TRANSMUTER · WALLET"
          title={
            <>
              <span className="c">MY</span> COINS
            </>
          }
          subtitle="Created launches from the Factory registry, plus EOL tokens this wallet holds."
        />
        <MyCoinsView />
      </Wrap>
      <SiteFooter />
    </div>
  );
}
