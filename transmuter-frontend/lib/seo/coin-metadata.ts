import type { Metadata } from "next";
import { coinPath } from "@/lib/routes";
import { assetUrl } from "@/lib/seo/constants";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { metaDescription } from "@/lib/seo/text";

type CoinShareSource = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  logoUrl: string | null;
};

export function coinShareDescription(coin: Pick<CoinShareSource, "name" | "symbol" | "description">): string {
  return metaDescription(
    coin.description,
    `${coin.name} (${coin.symbol}) on Transmuter. Factory-registered launch with an isolated treasury and end of life rules fixed before trading.`,
  );
}

export function coinShareMetadata(coin: CoinShareSource): Metadata {
  return marketingPageMetadata({
    path: coinPath(coin.mint),
    title: `${coin.name} (${coin.symbol})`,
    description: coinShareDescription(coin),
    image: shareImageUrl(coin.logoUrl),
  });
}

export function unlistedCoinMetadata(mint: string): Metadata {
  return marketingPageMetadata({
    path: coinPath(mint),
    title: "Launch",
    description: "This Transmuter launch is not available in the index.",
    index: false,
  });
}

/** https logos and same-site paths can be share cards. data URLs cannot. */
export function shareImageUrl(logoUrl: string | null | undefined): string | undefined {
  if (!logoUrl) return undefined;
  if (logoUrl.startsWith("https://")) return logoUrl;
  if (logoUrl.startsWith("/") && !logoUrl.startsWith("//")) return assetUrl(logoUrl);
  return undefined;
}
