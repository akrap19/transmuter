import { claimablesFromCoin } from "./claimables";
import { MOCK_DETAILS, MOCK_SALE_DEPOSITS } from "./mock-detail";
import {
  emptyRedeemLegs,
  MOCK_ESCROW,
  MOCK_REDEEM_LEGS,
  MOCK_REDEEM_OVERLAY,
  MOCK_VESTING,
} from "./mock-claims";
import { MOCK_ACCOUNTS, MOCK_CATALOG, MOCK_PORTFOLIOS, CATALOG_NOW } from "./mock";
import { createdCoins, heldCoins } from "./my-coins";
import { buildPortfolio, holdingsFromCoins } from "./portfolio";
import { queryCoins } from "./query";
import { REDEMPTION_TREASURY_FEE_BPS, redeemAvailable } from "./redeem";
import { STAKE_FEE_BPS, stakingAvailable } from "./stake";
import { buildTreasury } from "./treasury";
import type {
  CoinDetail,
  CoinEscrow,
  CoinListItem,
  CoinQuery,
  CoinRedeem,
  CoinSocials,
  CoinStake,
  CoinVesting,
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
  const myDepositUsdc = wallet ? (MOCK_SALE_DEPOSITS[wallet]?.[mint] ?? 0) : 0;

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
    redeem: coinRedeem(coin, wallet),
    vesting: coinVesting(coin.mint),
    escrow: coinEscrow(coin.mint),
  };
}

function coinStake(coin: CoinListItem, wallet?: string): CoinStake | null {
  if (!stakingAvailable(coin.status)) return null;

  const position = wallet ? MOCK_PORTFOLIOS[wallet]?.stakes.find((row) => row.mint === coin.mint) : undefined;
  const walletBalance = wallet
    ? (MOCK_ACCOUNTS[wallet]?.find((row) => row.mint === coin.mint)?.amount ?? 0)
    : 0;

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

function coinRedeem(coin: CoinListItem, wallet?: string): CoinRedeem | null {
  if (!redeemAvailable(coin.status)) return null;
  const extras = MOCK_DETAILS[coin.mint];
  const treasury = extras ? buildTreasury(extras.treasury) : EMPTY_TREASURY;
  const overlay = MOCK_REDEEM_OVERLAY[coin.mint];
  const walletBalance = wallet
    ? (MOCK_ACCOUNTS[wallet]?.find((row) => row.mint === coin.mint)?.amount ?? 0)
    : 0;
  const unconvertedUsdc = treasury.unconvertedUsdc;
  return {
    walletBalance,
    circulatingSupply: treasury.circulatingSupply,
    cTokenTreasury: treasury.cTokenAmount,
    unconvertedUsdc,
    escrowUsdc: overlay?.escrowUsdc ?? 0,
    treasuryFeeBps: REDEMPTION_TREASURY_FEE_BPS,
    treasuryCsolAvailable: treasury.cTokenAmount,
    treasuryUsdcAvailable: overlay?.treasuryUsdcAvailable ?? unconvertedUsdc,
    legs: wallet ? (MOCK_REDEEM_LEGS[wallet]?.[coin.mint] ?? emptyRedeemLegs()) : emptyRedeemLegs(),
  };
}

function coinVesting(mint: string): CoinVesting | null {
  return MOCK_VESTING[mint] ?? null;
}

function coinEscrow(mint: string): CoinEscrow | null {
  return MOCK_ESCROW[mint] ?? null;
}

export function getPortfolio(wallet: string, accounts?: TokenAccountBalance[], now = CATALOG_NOW) {
  const extras = MOCK_PORTFOLIOS[wallet];
  const claimables = MOCK_CATALOG.flatMap((item) => {
    const detail = getCoinDetail(item.mint, wallet);
    return detail ? claimablesFromCoin(detail, wallet, now) : [];
  });

  if (extras && accounts == null) return buildPortfolio({ ...extras, claimables });

  return buildPortfolio({
    holdings: holdingsFromCoins(listHeld(wallet, accounts)),
    stakes: extras?.stakes ?? EMPTY_PORTFOLIO.stakes,
    claimables,
    openVotes: extras?.openVotes ?? EMPTY_PORTFOLIO.openVotes,
  });
}
