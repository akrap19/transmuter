import type { Metadata } from "next";
import "@/app/brand/wallet.css";
import { parsePreviewFlag, searchParamsFromRecord } from "@/lib/catalog/search-params";
import { routes } from "@/lib/routes";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { MyCoinsView } from "./my-coins-view";

export const metadata: Metadata = marketingPageMetadata({
  path: routes.myCoins,
  title: "My Coins",
  description: "Launches you created on Transmuter and EOL tokens you hold.",
  index: false,
});

type MyCoinsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MyCoinsPage({ searchParams }: MyCoinsPageProps) {
  const preview = parsePreviewFlag(searchParamsFromRecord(await searchParams));

  return (
    <main className="wallet-page">
      <section className="subhero section-shell">
        <p className="eyebrow">TRANSMUTER · WALLET</p>
        <h1>My coins</h1>
        <p>Created launches from the Factory registry, plus EOL tokens this wallet holds.</p>
      </section>
      <section className="wallet-section section-shell">
        <MyCoinsView preview={preview} />
      </section>
    </main>
  );
}
