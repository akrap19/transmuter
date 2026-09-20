import { MOCK_DETAILS, MOCK_SALE_DEPOSITS } from "./mock-detail";
import { MOCK_ACCOUNTS, MOCK_CATALOG, MOCK_PORTFOLIOS } from "./mock";
import { createdCoins, heldCoins } from "./my-coins";
import { buildPortfolio, holdingsFromCoins } from "./portfolio";
import { queryCoins } from "./query";
import { STAKE_FEE_BPS, stakingAvailable } from "./stake";
import { buildTreasury } from "./treasury";
import type {
  CoinDetail,
  CoinListItem,
  CoinQuery,
  CoinSocials,
  CoinStake,
  PortfolioInput,
  TokenAccountBalance,
  TreasurySnapshot,
} from "./types";

const EMPTY_PORTFOLIO: PortfolioInput = {
  holdings: [],
  stakes: [],
  claimables: [],
  openVotes: [],
};

export function listCoins(query: CoinQuery) {
  return queryCoins(MOCK_CATALOG, query);
}

export function getCoinByMint(mint: string) {
  return MOCK_CATALOG.find((item) => item.mint === mint) ?? null;
}

const EMPTY_SOCIALS: CoinSocials = {
  website: null,
  twitter: null,
  telegram: null,
  discord: null,
};

const EMPTY_TREASURY: TreasurySnapshot = buildTreasury({
  cTokenAmount: 0,
  unconvertedUsdc: 0,
  cTokenPriceUsd: 0,
  circulatingSupply: 0,
  reserveMint: {
    pathAReady: false,
    pathBActivated: false,
    governedPct: 0,
    mintsThisYear: 0,
    yearlyCap: 3,
  },
});

export function getCoinDetail(mint: string, wallet?: string): CoinDetail | null {
  const coin = getCoinByMint(mint);
  if (!coin) return null;

  const extras = MOCK_DETAILS[mint];
  const myDepositUsdc = (wallet && MOCK_SALE_DEPOSITS[wallet]?.[mint]) ?? 0;

  return {
    ...coin,
    description: extras?.description ?? "",
    socials: extras?.socials ?? EMPTY_SOCIALS,
    treasury: extras ? buildTreasury(extras.treasury) : EMPTY_TREASURY,
    sale: extras?.sale ? { ...extras.sale, myDepositUsdc } : null,
    trade: extras?.trade ?? null,
    chart: extras?.chart ?? [],
    stake: coinStake(coin, wallet),
    votes: extras?.votes ?? [],
  };
}

function coinStake(coin: CoinListItem, wallet?: string): CoinStake | null {
  if (!stakingAvailable(coin.status)) return null;

  const position = wallet ? MOCK_PORTFOLIOS[wallet]?.stakes.find((row) => row.mint === coin.mint) : undefined;
  const walletBalance = (wallet && MOCK_ACCOUNTS[wallet]?.find((row) => row.mint === coin.mint)?.amount) ?? 0;

  return {
    staked: position?.staked ?? 0,
    weight: position?.weight ?? 0,
    voterLockedUntil: position?.voterLockedUntil ?? null,
    walletBalance,
    feeBps: STAKE_FEE_BPS,
    liquidated: coin.status === "liquidating",
  };
}

export function getCoinChart(mint: string) {
  return getCoinDetail(mint)?.chart ?? [];
}

export function listCreated(wallet: string) {
  return createdCoins(MOCK_CATALOG, wallet);
}

export function listHeld(wallet: string, accounts?: TokenAccountBalance[]) {
  return heldCoins(MOCK_CATALOG, accounts ?? MOCK_ACCOUNTS[wallet] ?? []);
}

export function getPortfolio(wallet: string, accounts?: TokenAccountBalance[]) {
  const extras = MOCK_PORTFOLIOS[wallet];
  if (extras && accounts == null) return buildPortfolio(extras);

  return buildPortfolio({
    holdings: holdingsFromCoins(listHeld(wallet, accounts)),
    stakes: extras?.stakes ?? EMPTY_PORTFOLIO.stakes,
    claimables: extras?.claimables ?? EMPTY_PORTFOLIO.claimables,
    openVotes: extras?.openVotes ?? EMPTY_PORTFOLIO.openVotes,
  });
}
