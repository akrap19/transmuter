import { describe, expect, it, vi } from "vitest";
import { assemblePortfolio, loadLivePortfolio, type LivePortfolioPosition } from "./load-portfolio";
import { SCHEDULE_NONE } from "./schedule";
import type { CoinListItem, CoinVote } from "./types";

const WALLET = "Holder11111111111111111111111111111111111";
const OTHER = "Other111111111111111111111111111111111111";
const NOW = 1_700_000_100;

const HELIX: CoinListItem = {
  mint: "MintHelix111111111111111111111111111111111",
  name: "Helix",
  symbol: "HLX",
  creator: OTHER,
  backing: "cSOL",
  status: "active",
  priceUsd: 2.15,
  marketCapUsd: 860_000,
  backingRatioBps: 2140,
  saleProgressBps: 0,
  holderCount: 12,
  launchedAt: 1_700_000_000,
  logoUrl: null,
  metadataUri: null,
};

const FORGE: CoinListItem = {
  ...HELIX,
  mint: "MintForge11111111111111111111111111111111",
  name: "Forge",
  symbol: "FRG",
  creator: WALLET,
  priceUsd: 1,
};

const VOTE: CoinVote = {
  kind: "liquidation",
  closesAt: NOW + 60,
  yesWeight: 6,
  noWeight: 1,
  quorumBps: 1_000,
  passBps: 6_700,
  denom: 20,
};

describe("assemblePortfolio", () => {
  it("prices indexed balances and ignores token accounts outside the catalog", () => {
    const snapshot = assemblePortfolio({
      catalog: [HELIX],
      accounts: [
        { mint: HELIX.mint, amount: 40 },
        { mint: "UnknownMint111111111111111111111111111", amount: 9 },
      ],
      positions: [],
      wallet: WALLET,
      now: NOW,
    });

    expect(snapshot.holdings).toEqual([
      { mint: HELIX.mint, name: "Helix", symbol: "HLX", amount: 40, valueUsd: 86 },
    ]);
    expect(snapshot.totals.holdingsUsd).toBe(86);
  });

  it("lists a stake only when this wallet has tokens staked", () => {
    const snapshot = assemblePortfolio({
      catalog: [HELIX],
      accounts: [],
      positions: [
        {
          coin: HELIX,
          position: position({
            stake: {
              staked: 1.5,
              weight: 1.5,
              voterLockedUntil: NOW + 10,
              walletBalance: 0,
              feeBps: 0,
              liquidated: false,
            },
          }),
        },
        { coin: FORGE, position: position({ stake: emptyStake(0) }) },
      ],
      wallet: WALLET,
      now: NOW,
    });

    expect(snapshot.stakes).toEqual([
      {
        mint: HELIX.mint,
        name: "Helix",
        symbol: "HLX",
        staked: 1.5,
        weight: 1.5,
        voterLockedUntil: NOW + 10,
      },
    ]);
  });

  it("lists vesting owed to this wallet even when the token is not in the wallet yet", () => {
    const snapshot = assemblePortfolio({
      catalog: [FORGE],
      accounts: [],
      positions: [
        {
          coin: FORGE,
          position: position({
            vesting: {
              recipient: WALLET,
              kind: "team",
              schedule: SCHEDULE_NONE,
              startTime: 1,
              liquidationTimestamp: 0,
              totalAllocation: 500,
              alreadyClaimed: 0,
            },
          }),
        },
      ],
      wallet: WALLET,
      now: NOW,
    });

    expect(snapshot.claimables).toEqual([
      { mint: FORGE.mint, name: "Forge", symbol: "FRG", kind: "vesting", amount: 500, asset: "FRG" },
    ]);
  });

  it("shows an open vote on a coin this wallet holds and hides one it has no part in", () => {
    const snapshot = assemblePortfolio({
      catalog: [HELIX, FORGE],
      accounts: [{ mint: HELIX.mint, amount: 1 }],
      positions: [
        { coin: HELIX, position: position({ votes: [VOTE] }) },
        { coin: FORGE, position: position({ votes: [{ ...VOTE, kind: "reserve_mint" }] }) },
      ],
      wallet: OTHER,
      now: NOW,
    });

    expect(snapshot.openVotes.map((vote) => vote.mint)).toEqual([HELIX.mint]);
    expect(snapshot.openVotes[0]).toMatchObject({ kind: "liquidation", yesWeight: 6, noWeight: 1, closesAt: NOW + 60 });
  });
});

describe("loadLivePortfolio", () => {
  it("returns not ok when the catalog API does not respond", async () => {
    const readPosition = vi.fn();
    const loaded = await loadLivePortfolio({
      wallet: WALLET,
      accounts: [{ mint: HELIX.mint, amount: 1 }],
      now: NOW,
      readPosition,
      env: {},
    });

    expect(loaded).toEqual({ ok: false });
    expect(readPosition).not.toHaveBeenCalled();
  });

  it("assembles holdings from the index and keeps them when one chain read fails", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [HELIX, FORGE], total: 2 }),
    });
    const readPosition = vi.fn(async (coin: CoinListItem) => {
      if (coin.mint === FORGE.mint) throw new Error("rpc");
      return position({
        stake: {
          staked: 4,
          weight: 4,
          voterLockedUntil: null,
          walletBalance: 40,
          feeBps: 0,
          liquidated: false,
        },
      });
    });

    const loaded = await loadLivePortfolio({
      wallet: WALLET,
      accounts: [{ mint: HELIX.mint, amount: 40 }],
      now: NOW,
      readPosition,
      fetchFn,
      env: { NEXT_PUBLIC_API_URL: "http://api.test" },
    });

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.snapshot.holdings).toEqual([
      { mint: HELIX.mint, name: "Helix", symbol: "HLX", amount: 40, valueUsd: 86 },
    ]);
    expect(loaded.snapshot.stakes).toEqual([
      { mint: HELIX.mint, name: "Helix", symbol: "HLX", staked: 4, weight: 4, voterLockedUntil: null },
    ]);
    expect(fetchFn).toHaveBeenCalledWith("http://api.test/coins", { cache: "no-store" });
  });
});

function position(partial: Partial<LivePortfolioPosition> = {}): LivePortfolioPosition {
  return {
    stake: null,
    vesting: null,
    escrow: null,
    redeem: null,
    votes: [],
    ...partial,
  };
}

function emptyStake(staked: number): NonNullable<LivePortfolioPosition["stake"]> {
  return {
    staked,
    weight: staked,
    voterLockedUntil: null,
    walletBalance: 0,
    feeBps: 0,
    liquidated: false,
  };
}
