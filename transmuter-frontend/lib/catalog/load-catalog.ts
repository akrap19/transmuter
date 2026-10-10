import { fetchCoinChart, fetchCoinList, fetchCoinRecord, type ApiCoin } from "./api";
import type { LiveSaleView } from "./live-sale";
import { MOCK_CATALOG } from "./mock";
import { queryCoins } from "./query";
import { buildTreasury } from "./treasury";
import type { ChartPoint, CoinDetail, CoinQuery, CoinQueryResult, CoinSocials, TreasurySnapshot } from "./types";

export type CatalogSource = "api" | "sample";

type BackingOverlay = {
  treasury: TreasurySnapshot;
  backingRatioBps: number | null;
  priceUsd?: number | null;
  marketCapUsd?: number | null;
  holderCount?: number | null;
};

type LoadOptions = {
  fetchFn?: typeof fetch;
  env?: Record<string, string | undefined>;
  readLive?: (mint: string) => Promise<LiveSaleView | null>;
  /** Treasury dollars for the first paint, so a refresh does not wait on the browser RPC. */
  readBacking?: (mint: string) => Promise<BackingOverlay | null>;
  /** Factory account read used when the index has not caught the launch yet. */
  readChain?: (mint: string) => Promise<CoinDetail | null>;
};

const EMPTY_SOCIALS: CoinSocials = {
  website: null,
  twitter: null,
  telegram: null,
  discord: null,
};

const EMPTY_TREASURY = buildTreasury({
  cTokenAmount: 0,
  unconvertedUsdc: 0,
  cTokenPriceUsd: 0,
  circulatingSupply: 0,
  reserveMint: { pathAReady: false, pathBActivated: false, governedPct: 0, mintsThisYear: 0, yearlyCap: 3 },
});

export async function loadCoinList(
  query: CoinQuery,
  options: LoadOptions = {},
): Promise<{ result: CoinQueryResult; source: CatalogSource }> {
  const fetched = await fetchCoinList(query, options);
  if (fetched.ok) return { result: fetched.data, source: "api" };
  return { result: queryCoins(MOCK_CATALOG, query), source: "sample" };
}

export type LoadedCoin =
  | { kind: "coin"; detail: CoinDetail; source: "api" | "chain" }
  | { kind: "missing" }
  | { kind: "unavailable" };

export async function loadCoinDetail(mint: string, options: LoadOptions = {}): Promise<LoadedCoin> {
  const [record, chart, live, backing] = await Promise.all([
    fetchCoinRecord(mint, options),
    fetchCoinChart(mint, options),
    options.readLive ? options.readLive(mint).catch(() => null) : Promise.resolve(null),
    options.readBacking ? options.readBacking(mint).catch(() => null) : Promise.resolve(null),
  ]);

  if (!record.ok) {
    if (record.status === 404 && options.readChain) {
      try {
        const chain = await options.readChain(mint);
        if (chain) return { kind: "coin", detail: mergeBacking(mergeLiveDetail(chain, live), backing), source: "chain" };
      } catch {
        // The index miss stands when the chain read fails.
      }
    }
    return record.status === 404 ? { kind: "missing" } : { kind: "unavailable" };
  }

  const points = chart.ok ? chart.data : record.data.chart;
  const detail = mergeBacking(mergeLiveDetail(detailFromApi(record.data, points), live), backing);
  return { kind: "coin", detail, source: "api" };
}

export function detailFromApi(coin: ApiCoin, chart: ChartPoint[]): CoinDetail {
  return {
    ...coin,
    description: coin.description,
    socials: coin.socials ?? EMPTY_SOCIALS,
    treasury: EMPTY_TREASURY,
    sale: null,
    trade: null,
    chart,
    stake: null,
    votes: [],
    redeem: null,
    vesting: null,
    escrow: null,
  };
}

export function mergeBacking(
  detail: CoinDetail,
  backing: {
    treasury: TreasurySnapshot;
    backingRatioBps: number | null;
    priceUsd?: number | null;
    marketCapUsd?: number | null;
    holderCount?: number | null;
  } | null,
): CoinDetail {
  if (!backing) return detail;
  return {
    ...detail,
    treasury: backing.treasury,
    backingRatioBps: backing.backingRatioBps ?? detail.backingRatioBps,
    priceUsd: backing.priceUsd ?? detail.priceUsd,
    marketCapUsd: backing.marketCapUsd ?? detail.marketCapUsd,
    holderCount: backing.holderCount ?? detail.holderCount,
  };
}

export function mergeLiveDetail(detail: CoinDetail, live: LiveSaleView | null): CoinDetail {
  if (!live) return detail;
  return {
    ...detail,
    status: live.status,
    sale: live.sale,
    saleProgressBps: live.sale ? live.saleProgressBps : detail.saleProgressBps,
  };
}

export function mergeHolder(
  detail: CoinDetail,
  holder: {
    stake: CoinDetail["stake"];
    vesting: CoinDetail["vesting"];
    escrow: CoinDetail["escrow"];
    redeem: CoinDetail["redeem"];
    votes: CoinDetail["votes"];
  } | null,
): CoinDetail {
  if (!holder) return detail;
  return {
    ...detail,
    stake: holder.stake,
    vesting: holder.vesting,
    escrow: holder.escrow,
    redeem: holder.redeem,
    votes: holder.votes,
  };
}
