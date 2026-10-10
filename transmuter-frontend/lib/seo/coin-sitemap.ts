import { fetchCoinList } from "@/lib/catalog/api";
import { coinPath } from "@/lib/routes";

const PAGE_SIZE = 500;
const MAX_PAGES = 20;

export type SitemapCoin = {
  path: string;
  lastModified?: Date;
};

/** Indexed launches for the sitemap. An API miss leaves the static pages in place. */
export async function listSitemapCoins(
  options?: Parameters<typeof fetchCoinList>[1],
  pageSize = PAGE_SIZE,
): Promise<SitemapCoin[]> {
  const coins: SitemapCoin[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchCoinList(
      { limit: pageSize, offset, sort: "launchedAt", dir: "desc" },
      options,
    );
    if (!result.ok) return coins;
    for (const item of result.data.items) {
      coins.push({
        path: coinPath(item.mint),
        lastModified: launchedAtDate(item.launchedAt),
      });
    }
    offset += result.data.items.length;
    if (result.data.items.length === 0 || offset >= result.data.total) break;
  }

  return coins;
}

function launchedAtDate(seconds: number): Date | undefined {
  if (!Number.isFinite(seconds) || seconds < 1_000_000_000) return undefined;
  return new Date(seconds * 1000);
}
