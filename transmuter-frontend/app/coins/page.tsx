import type { Metadata } from "next";
import "@/app/brand/explore.css";
import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { ExploreToolbar } from "@/components/catalog/explore-toolbar";
import { InfiniteCoinGrid } from "@/components/catalog/infinite-coin-grid";
import { explorePageQuery } from "@/lib/catalog/explore-page";
import { loadCoinList } from "@/lib/catalog/load-catalog";
import { parseCoinSearchParams, searchParamsFromRecord, serializeCoinQuery } from "@/lib/catalog/search-params";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse every Transmuter launch, including VOIDED sales. Search, sort, and filter the indexed Factory registry.",
};

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const query = parseCoinSearchParams(searchParamsFromRecord(await searchParams));
  const { result, source } = await loadCoinList(explorePageQuery(query, 0));

  return (
    <main className="explore-page">
      <section className="subhero section-shell explore-hero">
        <p className="eyebrow">EXPLORE</p>
        <h1>All coins</h1>
        <p>Every Factory-registered launch, including VOIDED. Search, sort, and filter the index.</p>
      </section>
      <section className="explore-section section-shell">
        {source === "sample" ? <CatalogBanner /> : null}
        <ExploreToolbar query={query} />
        <p className="explore-count">
          {result.total} launch{result.total === 1 ? "" : "es"}
        </p>
        {result.items.length === 0 ? (
          <CatalogEmpty title="No launches match" body="Clear search or filters to see the full index, including VOIDED sales." />
        ) : (
          <InfiniteCoinGrid
            key={serializeCoinQuery(query).toString()}
            items={result.items}
            total={result.total}
            query={query}
            source={source}
          />
        )}
      </section>
    </main>
  );
}
