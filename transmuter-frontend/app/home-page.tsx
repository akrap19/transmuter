import type { Metadata } from "next";
import { HomeClose, HomeEntry, HomeFaq } from "@/components/brand/home/home-close";
import { HomeHero } from "@/components/brand/home/home-hero";
import { HomeWaterfall } from "@/components/brand/home/home-waterfall";
import { LifecycleChart } from "@/components/brand/home/lifecycle-chart";
import { ProblemSection } from "@/components/brand/home/problem-section";
import { ProofStrip } from "@/components/brand/home/proof-strip";
import { ReserveStack } from "@/components/brand/home/reserve-stack";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { homePageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const homeTitle = "Transmuter: Value recovery infrastructure for tokens";
const homeDescription =
  "Launch a Solana token with an isolated treasury, contract-owned liquidity and recovery rules fixed before trading, so buyers can check the contract.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/",
  title: homeTitle,
  description: homeDescription,
  absoluteTitle: true,
});

export function HomePage() {
  return (
    <main id="top">
      <JsonLdScript data={homePageGraph({ name: homeTitle, description: homeDescription })} />
      <HomeHero />
      <LifecycleChart />
      <ProofStrip />
      <ProblemSection />
      <HomeWaterfall />
      <ReserveStack />
      <HomeEntry />
      <HomeFaq />
      <HomeClose />
    </main>
  );
}
