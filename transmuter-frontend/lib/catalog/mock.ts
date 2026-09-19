import type {
  CoinListItem,
  PortfolioInput,
  TokenAccountBalance,
} from "./types";

export const MOCK_PREVIEW_WALLET = "TmPrev1111111111111111111111111111111111111";
export const MOCK_OTHER_WALLET = "TmOthr1111111111111111111111111111111111111";

export const CATALOG_NOTICE =
  "Showing sample indexed launches until the backend index is live. VOIDED sales stay in the list.";

function coin(
  partial: Pick<CoinListItem, "mint" | "name" | "symbol" | "creator" | "status"> & Partial<CoinListItem>,
): CoinListItem {
  return {
    backing: "cSOL",
    priceUsd: 1,
    marketCapUsd: 10_000,
    backingRatioBps: 1800,
    saleProgressBps: 0,
    holderCount: 24,
    launchedAt: 1_746_000_000,
    logoUrl: null,
    metadataUri: null,
    ...partial,
  };
}

export const MOCK_CATALOG: CoinListItem[] = [
  coin({
    mint: "MintAurora11111111111111111111111111111111",
    name: "Aurora",
    symbol: "AUR",
    creator: MOCK_PREVIEW_WALLET,
    status: "sale",
    priceUsd: 0.42,
    marketCapUsd: 42_000,
    saleProgressBps: 6100,
    launchedAt: 1_746_200_000,
  }),
  coin({
    mint: "MintHelix111111111111111111111111111111111",
    name: "Helix",
    symbol: "HLX",
    creator: MOCK_OTHER_WALLET,
    status: "active",
    priceUsd: 2.15,
    marketCapUsd: 860_000,
    backingRatioBps: 2140,
    holderCount: 318,
    launchedAt: 1_745_100_000,
  }),
  coin({
    mint: "MintNimbus1111111111111111111111111111111",
    name: "Nimbus",
    symbol: "NMB",
    creator: MOCK_PREVIEW_WALLET,
    status: "voided",
    priceUsd: null,
    marketCapUsd: null,
    backingRatioBps: null,
    saleProgressBps: 1800,
    holderCount: 0,
    launchedAt: 1_744_800_000,
  }),
  coin({
    mint: "MintForge11111111111111111111111111111111",
    name: "Forge",
    symbol: "FRG",
    creator: MOCK_PREVIEW_WALLET,
    status: "active",
    backing: "cBTC",
    priceUsd: 1.08,
    marketCapUsd: 216_000,
    backingRatioBps: 1925,
    holderCount: 91,
    launchedAt: 1_745_800_000,
  }),
  coin({
    mint: "MintQuanta1111111111111111111111111111111",
    name: "Quanta",
    symbol: "QNT",
    creator: MOCK_OTHER_WALLET,
    status: "wired",
    priceUsd: null,
    marketCapUsd: null,
    saleProgressBps: 0,
    holderCount: 0,
    launchedAt: 1_746_400_000,
  }),
  coin({
    mint: "MintEmber11111111111111111111111111111111",
    name: "Ember",
    symbol: "EMB",
    creator: MOCK_PREVIEW_WALLET,
    status: "created",
    priceUsd: null,
    marketCapUsd: null,
    holderCount: 0,
    launchedAt: 1_746_500_000,
  }),
  coin({
    mint: "MintSolace1111111111111111111111111111111",
    name: "Solace",
    symbol: "SLC",
    creator: MOCK_OTHER_WALLET,
    status: "liquidating",
    priceUsd: 0.31,
    marketCapUsd: 48_000,
    backingRatioBps: 2210,
    holderCount: 64,
    launchedAt: 1_743_000_000,
  }),
];

export const MOCK_ACCOUNTS: Record<string, TokenAccountBalance[]> = {
  [MOCK_PREVIEW_WALLET]: [
    { mint: "MintHelix111111111111111111111111111111111", amount: 40 },
    { mint: "MintForge11111111111111111111111111111111", amount: 12.5 },
    { mint: "MintSolace1111111111111111111111111111111", amount: 8 },
  ],
};

export const MOCK_PORTFOLIOS: Record<string, PortfolioInput> = {
  [MOCK_PREVIEW_WALLET]: {
    holdings: [
      { mint: "MintHelix111111111111111111111111111111111", name: "Helix", symbol: "HLX", amount: 40, valueUsd: 86 },
      { mint: "MintForge11111111111111111111111111111111", name: "Forge", symbol: "FRG", amount: 12.5, valueUsd: 13.5 },
      { mint: "MintSolace1111111111111111111111111111111", name: "Solace", symbol: "SLC", amount: 8, valueUsd: 2.48 },
    ],
    stakes: [
      {
        mint: "MintHelix111111111111111111111111111111111",
        name: "Helix",
        symbol: "HLX",
        staked: 10,
        weight: 10,
        voterLockedUntil: 1_747_200_000,
      },
    ],
    claimables: [
      { mint: "MintEmber11111111111111111111111111111111", name: "Ember", symbol: "EMB", kind: "vesting", amount: 500, asset: "EMB" },
      { mint: "MintForge11111111111111111111111111111111", name: "Forge", symbol: "FRG", kind: "redemption", amount: 1.2, asset: "cSOL" },
      { mint: "MintForge11111111111111111111111111111111", name: "Forge", symbol: "FRG", kind: "escrow", amount: 240, asset: "USDC" },
    ],
    openVotes: [
      {
        mint: "MintSolace1111111111111111111111111111111",
        name: "Solace",
        symbol: "SLC",
        kind: "liquidation",
        closesAt: 1_747_000_000,
        yesWeight: 18_400,
        noWeight: 2_100,
        quorumBps: 1000,
      },
      {
        mint: "MintForge11111111111111111111111111111111",
        name: "Forge",
        symbol: "FRG",
        kind: "reserve_mint",
        closesAt: 1_746_900_000,
        yesWeight: 4_200,
        noWeight: 6_800,
        quorumBps: 1000,
      },
    ],
  },
};
