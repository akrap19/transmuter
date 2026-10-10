import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import "@/app/brand/coin-detail.css";
import { CoinCrumb } from "@/app/coins/[mint]/coin-crumb";
import { CoinLive } from "@/app/coins/[mint]/coin-live";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { fetchCoinRecord } from "@/lib/catalog/api";
import { loadCoinDetail } from "@/lib/catalog/load-catalog";
import { readServerChainCoin } from "@/lib/catalog/read-chain-coin";
import { readServerLiveSale } from "@/lib/catalog/read-live-sale-rpc";
import { readServerBacking } from "@/lib/catalog/read-post-sale-rpc";
import { explorePathFromCoinSearch, searchParamsFromRecord } from "@/lib/catalog/search-params";
import { coinShareDescription, coinShareMetadata, unlistedCoinMetadata } from "@/lib/seo/coin-metadata";
import { coinPageGraph } from "@/lib/seo/json-ld";

type CoinPageProps = {
  params: Promise<{ mint: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CoinPageProps): Promise<Metadata> {
  const { mint } = await params;
  const record = await fetchCoinRecord(mint);
  if (record.ok) return coinShareMetadata(record.data);
  if (record.status === 404) {
    try {
      const chain = await readServerChainCoin(mint);
      if (chain) return coinShareMetadata(chain);
    } catch {
      // The index miss stands when the chain read fails.
    }
    notFound();
  }
  return unlistedCoinMetadata(mint);
}

export default async function CoinPage({ params, searchParams }: CoinPageProps) {
  const { mint } = await params;
  const backHref = explorePathFromCoinSearch(searchParamsFromRecord(await searchParams));
  const loaded = await loadCoinDetail(mint, {
    readLive: readServerLiveSale,
    readBacking: readServerBacking,
    readChain: readServerChainCoin,
  });

  if (loaded.kind === "missing") notFound();

  return (
    <main className="coin-page">
      {loaded.kind === "coin" ? (
        <>
          <JsonLdScript
            data={coinPageGraph({
              mint,
              name: `${loaded.detail.name} (${loaded.detail.symbol})`,
              description: coinShareDescription(loaded.detail),
            })}
          />
          <CoinLive detail={loaded.detail} backHref={backHref} />
        </>
      ) : (
        <IndexUnavailable mint={mint} backHref={backHref} />
      )}
    </main>
  );
}

function IndexUnavailable({ mint, backHref }: { mint: string; backHref: string }) {
  return (
    <>
      <section className="subhero section-shell coin-hero">
        <CoinCrumb href={backHref} />
        <h1>Index unavailable</h1>
        <p>The catalog API did not respond. List fields, charts, and created coins come from that index.</p>
      </section>
      <section className="coin-body section-shell">
        <CatalogEmpty title={mint} body="Check NEXT_PUBLIC_API_URL and that the API is running.">
          <Link href={backHref} className="button button-primary">
            Back to Explore
          </Link>
        </CatalogEmpty>
      </section>
    </>
  );
}
