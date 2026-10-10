import type { Metadata } from "next";
import "@/app/brand/explore.css";
import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { ExploreToolbar } from "@/components/catalog/explore-toolbar";
import { InfiniteCoinGrid } from "@/components/catalog/infinite-coin-grid";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { explorePageQuery } from "@/lib/catalog/explore-page";
import { loadCoinList } from "@/lib/catalog/load-catalog";
import { coinQueryHasFilters, parseCoinSearchParams, searchParamsFromRecord, serializeCoinQuery } from "@/lib/catalog/search-params";
import { routes } from "@/lib/routes";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const exploreTitle = "All coins";
const exploreDescription =
  "Browse every Factory-registered launch on Transmuter, including live sales and VOIDED tokens. Search and check the contract before you trade.";

export async function generateMetadata({ searchParams }: ExplorePageProps): Promise<Metadata> {
  const query = parseCoinSearchParams(searchParamsFromRecord(await searchParams));
  return marketingPageMetadata({
    path: routes.coins,
    title: exploreTitle,
    description: exploreDescription,
    index: !coinQueryHasFilters(query),
  });
}

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const query = parseCoinSearchParams(searchParamsFromRecord(await searchParams));
  const { result, source } = await loadCoinList(explorePageQuery(query, 0));

  return (
    <main className="explore-page">
      <JsonLdScript
        data={marketingPageGraph({
          path: routes.coins,
          name: exploreTitle,
          description: exploreDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "All coins", path: routes.coins },
          ],
        })}
      />
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
