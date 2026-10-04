"use server";

import { explorePageQuery } from "@/lib/catalog/explore-page";
import { loadCoinList, type CatalogSource } from "@/lib/catalog/load-catalog";
import type { CoinQuery, CoinQueryResult } from "@/lib/catalog/types";

export async function loadExplorePage(
  query: CoinQuery,
  offset: number,
): Promise<{ result: CoinQueryResult; source: CatalogSource }> {
  return loadCoinList(explorePageQuery(query, offset));
}
