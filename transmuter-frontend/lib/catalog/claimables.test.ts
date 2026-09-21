import { describe, expect, it } from "vitest";
import { claimablesFromCoin } from "./claimables";
import { REDEMPTION_TREASURY_FEE_BPS } from "./redeem";
import { SCHEDULE_NONE } from "./schedule";
import type { CoinDetail } from "./types";

const WALLET = "TmPrev1111111111111111111111111111111111111";

function coin(partial: Partial<CoinDetail> & Pick<CoinDetail, "mint" | "name" | "symbol">): CoinDetail {
  return {
    creator: WALLET,
    backing: "cSOL",
    status: "active",
    priceUsd: 1,
    marketCapUsd: 1,
    backingRatioBps: 1800,
    saleProgressBps: 0,
    holderCount: 1,
    launchedAt: 1,
    logoUrl: null,
    metadataUri: null,
    description: "",
    socials: { website: null, twitter: null, telegram: null, discord: null },
    treasury: {
      cTokenAmount: 400,
      unconvertedUsdc: 8_000,
      cTokenPriceUsd: 180,
      circulatingSupply: 40_000,
      backingValueUsd: 80_000,
      redemptionRatio: 0.01,
      reserveMint: { pathAReady: false, pathBActivated: false, governedPct: 5, mintsThisYear: 0, yearlyCap: 3 },
    },
    sale: null,
    trade: null,
    chart: [],
    stake: null,
    votes: [],
    redeem: null,
    vesting: null,
    escrow: null,
    ...partial,
  };
}

describe("portfolio claimables from coin state", () => {
  it("emits vesting, unpaid redemption legs, and drawable escrow for the wallet that owns them", () => {
    const forge = coin({
      mint: "MintForge",
      name: "Forge",
      symbol: "FRG",
      vesting: {
        recipient: WALLET,
        kind: "team",
        schedule: SCHEDULE_NONE,
        startTime: 1,
        liquidationTimestamp: 0,
        totalAllocation: 500,
        alreadyClaimed: 0,
      },
      escrow: {
        teamRecipient: WALLET,
        schedule: SCHEDULE_NONE,
        startTime: 1,
        fundedPrincipal: 1_000,
        alreadyDrawn: 760,
        advanceUnlocked: 0,
        status: "active",
      },
      redeem: {
        walletBalance: 12.5,
        circulatingSupply: 20_000,
        cTokenTreasury: 220,
        unconvertedUsdc: 3_500,
        escrowUsdc: 0,
        treasuryFeeBps: REDEMPTION_TREASURY_FEE_BPS,
        treasuryCsolAvailable: 220,
        treasuryUsdcAvailable: 3_500,
        legs: [
          { asset: "cSOL", owed: 1.2, paid: 0 },
          { asset: "USDC", owed: 0, paid: 0 },
        ],
      },
    });

    expect(claimablesFromCoin(forge, WALLET, 2)).toEqual([
      { mint: "MintForge", name: "Forge", symbol: "FRG", kind: "vesting", amount: 500, asset: "FRG" },
      { mint: "MintForge", name: "Forge", symbol: "FRG", kind: "redemption", amount: 1.2, asset: "cSOL" },
      { mint: "MintForge", name: "Forge", symbol: "FRG", kind: "escrow", amount: 240, asset: "USDC" },
    ]);
  });

  it("hides another wallet's team pots and paid legs", () => {
    const helix = coin({
      mint: "MintHelix",
      name: "Helix",
      symbol: "HLX",
      vesting: {
        recipient: "other",
        kind: "team",
        schedule: SCHEDULE_NONE,
        startTime: 1,
        liquidationTimestamp: 0,
        totalAllocation: 100,
        alreadyClaimed: 0,
      },
      escrow: {
        teamRecipient: "other",
        schedule: SCHEDULE_NONE,
        startTime: 1,
        fundedPrincipal: 50,
        alreadyDrawn: 0,
        advanceUnlocked: 0,
        status: "active",
      },
      redeem: {
        walletBalance: 40,
        circulatingSupply: 40_000,
        cTokenTreasury: 400,
        unconvertedUsdc: 8_000,
        escrowUsdc: 0,
        treasuryFeeBps: REDEMPTION_TREASURY_FEE_BPS,
        treasuryCsolAvailable: 400,
        treasuryUsdcAvailable: 8_000,
        legs: [
          { asset: "cSOL", owed: 1, paid: 1 },
          { asset: "USDC", owed: 2, paid: 2 },
        ],
      },
    });

    expect(claimablesFromCoin(helix, WALLET, 2)).toEqual([]);
  });
});
