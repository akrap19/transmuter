import { MOCK_PREVIEW_WALLET } from "./mock";
import { voteThresholds } from "./governance";
import type { TreasuryInput } from "./treasury";
import { tradePools } from "./trade";
import type { ChartPoint, CoinSocials, CoinVote, SaleSnapshot, TradeSnapshot } from "./types";

export type CoinDetailExtras = {
  description: string;
  socials: CoinSocials;
  treasury: TreasuryInput;
  sale: Omit<SaleSnapshot, "myDepositUsdc"> | null;
  trade: TradeSnapshot | null;
  chart: ChartPoint[];
  votes: CoinVote[];
};

function vote(kind: CoinVote["kind"], closesAt: number, yesWeight: number, noWeight: number, denom: number): CoinVote {
  return { kind, closesAt, yesWeight, noWeight, denom, ...voteThresholds(kind) };
}

const helixMint = "MintHelix111111111111111111111111111111111";
const auroraMint = "MintAurora11111111111111111111111111111111";
const nimbusMint = "MintNimbus1111111111111111111111111111111";
const forgeMint = "MintForge11111111111111111111111111111111";
const quantaMint = "MintQuanta1111111111111111111111111111111";
const emberMint = "MintEmber11111111111111111111111111111111";
const solaceMint = "MintSolace1111111111111111111111111111111";

const idleReserve = {
  pathAReady: false,
  pathBActivated: false,
  governedPct: 5,
  mintsThisYear: 0,
  yearlyCap: 3,
} as const;

const emptyTreasury: TreasuryInput = {
  cTokenAmount: 0,
  unconvertedUsdc: 0,
  cTokenPriceUsd: 0,
  circulatingSupply: 0,
  reserveMint: idleReserve,
};

const none: CoinSocials = {
  website: null,
  twitter: null,
  telegram: null,
  discord: null,
};

export const MOCK_DETAILS: Record<string, CoinDetailExtras> = {
  [helixMint]: {
    description: "Post-finalize Helix treasury still holds unconverted USDC that every backing read must count.",
    socials: {
      website: "https://helix.example",
      twitter: "https://x.com/helix",
      telegram: "https://t.me/helix",
      discord: "https://discord.gg/helix",
    },
    treasury: {
      cTokenAmount: 400,
      unconvertedUsdc: 8_000,
      cTokenPriceUsd: 180,
      circulatingSupply: 40_000,
      reserveMint: { ...idleReserve, pathBActivated: true },
    },
    sale: null,
    trade: { pools: tradePools(helixMint, "HelixUsdcPool11111111111111111111111111", "HelixSolPool111111111111111111111111111") },
    votes: [vote("escrow_halt", 1_800_300_000, 8_000, 2_000, 40_000)],
    chart: [
      { t: 1_745_000_000, priceUsd: 1.8, volumeUsd: 12_400 },
      { t: 1_745_050_000, priceUsd: 1.96, volumeUsd: 9_100 },
      { t: 1_745_100_000, priceUsd: 2.15, volumeUsd: 18_600 },
    ],
  },
  [auroraMint]: {
    description: "Fixed-price USDC sale. Deposits stay withdrawable in full until close.",
    socials: {
      website: "https://aurora.example",
      twitter: "https://x.com/aurora",
      telegram: null,
      discord: null,
    },
    treasury: emptyTreasury,
    sale: {
      capUsdc: 100_000,
      raisedUsdc: 61_000,
      remainingUsdc: 39_000,
      priceUsd: 0.42,
      closesAt: 1_800_000_000,
      depositsOpen: true,
    },
    trade: null,
    votes: [],
    chart: [
      { t: 1_746_180_000, priceUsd: 0.42, volumeUsd: 4_200 },
      { t: 1_746_190_000, priceUsd: 0.42, volumeUsd: 8_800 },
      { t: 1_746_200_000, priceUsd: 0.42, volumeUsd: 12_100 },
    ],
  },
  [nimbusMint]: {
    description: "VOIDED sale. Every USDC deposit remains reclaimable; no treasury formed.",
    socials: none,
    treasury: emptyTreasury,
    sale: null,
    trade: null,
    votes: [],
    chart: [],
  },
  [forgeMint]: {
    description: "Active cBTC-backed launch. Path A reserve mint is ready; unconverted USDC still sits in treasury.",
    socials: { website: "https://forge.example", twitter: null, telegram: null, discord: "https://discord.gg/forge" },
    treasury: {
      cTokenAmount: 220,
      unconvertedUsdc: 3_500,
      cTokenPriceUsd: 95,
      circulatingSupply: 20_000,
      reserveMint: { ...idleReserve, pathAReady: true, mintsThisYear: 1 },
    },
    sale: null,
    trade: { pools: tradePools(forgeMint, "ForgeUsdcPool11111111111111111111111111", "ForgeSolPool111111111111111111111111111") },
    votes: [vote("reserve_mint", 1_800_400_000, 4_200, 6_800, 20_000)],
    chart: [
      { t: 1_745_700_000, priceUsd: 0.94, volumeUsd: 3_300 },
      { t: 1_745_750_000, priceUsd: 1.02, volumeUsd: 5_400 },
      { t: 1_745_800_000, priceUsd: 1.08, volumeUsd: 7_900 },
    ],
  },
  [quantaMint]: {
    description: "Wired, sale not open yet.",
    socials: none,
    treasury: emptyTreasury,
    sale: null,
    trade: null,
    votes: [],
    chart: [],
  },
  [emberMint]: {
    description: "Created on the Factory registry; wiring has not started.",
    socials: none,
    treasury: emptyTreasury,
    sale: null,
    trade: null,
    votes: [],
    chart: [],
  },
  [solaceMint]: {
    description: "Liquidation vote is open. Pools still trade while the treasury is counted, including unconverted USDC.",
    socials: { website: "https://solace.example", twitter: "https://x.com/solace", telegram: null, discord: null },
    treasury: {
      cTokenAmount: 160,
      unconvertedUsdc: 1_200,
      cTokenPriceUsd: 140,
      circulatingSupply: 15_000,
      reserveMint: idleReserve,
    },
    sale: null,
    trade: { pools: tradePools(solaceMint, "SolaceUsdcPool1111111111111111111111111", "SolaceSolPool11111111111111111111111111") },
    votes: [vote("liquidation", 1_800_500_000, 5_200, 800, 15_000)],
    chart: [
      { t: 1_742_900_000, priceUsd: 0.55, volumeUsd: 2_200 },
      { t: 1_742_950_000, priceUsd: 0.4, volumeUsd: 6_800 },
      { t: 1_743_000_000, priceUsd: 0.31, volumeUsd: 9_400 },
    ],
  },
};

export const MOCK_SALE_DEPOSITS: Record<string, Record<string, number>> = {
  [MOCK_PREVIEW_WALLET]: {
    [auroraMint]: 250,
  },
};
