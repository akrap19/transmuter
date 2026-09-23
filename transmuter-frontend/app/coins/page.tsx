import type { Metadata } from "next";
import "@/app/brand/explore.css";
import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CoinGrid } from "@/components/catalog/coin-grid";
import { ExploreToolbar } from "@/components/catalog/explore-toolbar";
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
    <main className="explore-page">
      <section className="subhero section-shell explore-hero">
        <p className="eyebrow">EXPLORE</p>
        <h1>All coins</h1>
        <p>Every Factory-registered launch, including VOIDED. Search, sort, and filter the index.</p>
      </section>
      <section className="explore-section section-shell">
        <CatalogBanner />
        <ExploreToolbar query={query} />
        <p className="explore-count">
          {result.total} launch{result.total === 1 ? "" : "es"}
        </p>
        {result.items.length === 0 ? (
          <CatalogEmpty title="No launches match" body="Clear search or filters to see the full index, including VOIDED sales." />
        ) : (
          <CoinGrid items={result.items} />
        )}
      </section>
    </main>
  );
}
