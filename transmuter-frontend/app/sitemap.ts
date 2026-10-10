import type { MetadataRoute } from "next";
import { absoluteUrl, indexableStaticPaths } from "@/lib/seo/constants";
import { listSitemapCoins } from "@/lib/seo/coin-sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const coins = await listSitemapCoins();
  return [
    ...indexableStaticPaths.map((path) => ({ url: absoluteUrl(path) })),
    ...coins.map((coin) => ({
      url: absoluteUrl(coin.path),
      ...(coin.lastModified ? { lastModified: coin.lastModified } : {}),
    })),
  ];
}
