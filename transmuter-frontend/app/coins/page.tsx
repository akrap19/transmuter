import type { Metadata } from "next";
import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { CoinTable } from "@/components/catalog/coin-table";
import { ExploreToolbar } from "@/components/catalog/explore-toolbar";
import { SiteFooter, SiteNav } from "@/components/transmuter/site-chrome";
import { Wrap } from "@/components/transmuter/wrap";
import { listCoins } from "@/lib/catalog/client";
import { parseCoinSearchParams, searchParamsFromRecord } from "@/lib/catalog/search-params";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse every Transmuter launch, including VOIDED sales. Search, sort, and filter the indexed Factory registry.",
};

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const query = parseCoinSearchParams(searchParamsFromRecord(await searchParams));
  const result = listCoins(query);

  return (
    <div className="page-docs page-catalog">
      <SiteNav />
      <Wrap>
        <CatalogHeader
          eyebrow="TRANSMUTER · EXPLORE"
          title={
            <>
              <span className="c">ALL</span> COINS
            </>
          }
          subtitle="Every Factory-registered launch, including VOIDED. Search, sort, and filter the index."
        />
        <CatalogBanner />
        <ExploreToolbar query={query} />
        <p className="catalog-count">
          {result.total} launch{result.total === 1 ? "" : "es"}
        </p>
        {result.items.length === 0 ? (
          <CatalogEmpty title="No launches match" body="Clear search or filters to see the full index, including VOIDED sales." />
        ) : (
          <CoinTable items={result.items} />
        )}
      </Wrap>
      <SiteFooter />
    </div>
  );
}
