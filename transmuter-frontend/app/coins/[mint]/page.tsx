import type { Metadata } from "next";
import Link from "next/link";
import "@/app/brand/coin-detail.css";
import { CoinLive } from "@/app/coins/[mint]/coin-live";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { fetchCoinRecord } from "@/lib/catalog/api";
import { loadCoinDetail } from "@/lib/catalog/load-catalog";
import { readServerLiveSale } from "@/lib/catalog/read-live-sale-rpc";
import { routes } from "@/lib/routes";

type CoinPageProps = {
  params: Promise<{ mint: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CoinPageProps): Promise<Metadata> {
  const { mint } = await params;
  const record = await fetchCoinRecord(mint);
  const coin = record.ok ? record.data : null;
  return {
    title: coin ? `${coin.name} (${coin.symbol})` : mint,
    description: coin
      ? `${coin.name} on Transmuter — Factory-registered EOL launch.`
      : `Transmuter launch ${mint}`,
  };
}

export default async function CoinPage({ params }: CoinPageProps) {
  const { mint } = await params;
  const loaded = await loadCoinDetail(mint, { readLive: readServerLiveSale });

  return (
    <main className="coin-page">
      {loaded.kind === "coin" ? (
        <CoinLive detail={loaded.detail} />
      ) : (
        <MissingCoin mint={mint} unavailable={loaded.kind === "unavailable"} />
      )}
    </main>
  );
}

function MissingCoin({ mint, unavailable }: { mint: string; unavailable: boolean }) {
  return (
    <>
      <section className="subhero section-shell coin-hero">
        <Link href={routes.coins} className="coin-back">
          All coins
        </Link>
        <p className="eyebrow">EXPLORE · TOKEN</p>
        <h1>{unavailable ? "Index unavailable" : "Mint not found"}</h1>
        <p>
          {unavailable
            ? "The catalog API did not respond. List fields, charts, and created coins come from that index."
            : "This mint is not in the Factory index. VOIDED and live launches both resolve here once indexed."}
        </p>
      </section>
      <section className="coin-body section-shell">
        <CatalogEmpty title={mint} body={unavailable ? "Check NEXT_PUBLIC_API_URL and that the API is running." : undefined}>
          <Link href={routes.coins} className="button button-primary">
            Back to Explore
          </Link>
        </CatalogEmpty>
      </section>
    </>
  );
}
