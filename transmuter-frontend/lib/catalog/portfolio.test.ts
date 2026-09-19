import { describe, expect, it } from "vitest";
import { buildPortfolio } from "./portfolio";

describe("buildPortfolio", () => {
  it("aggregates holdings, stakes, claimables, and open votes", () => {
    const snapshot = buildPortfolio({
      holdings: [
        { mint: "MintA", name: "Aurora", symbol: "AUR", amount: 10, valueUsd: 25 },
        { mint: "MintB", name: "Helix", symbol: "HLX", amount: 2, valueUsd: null },
      ],
      stakes: [{ mint: "MintA", name: "Aurora", symbol: "AUR", staked: 4, weight: 4, voterLockedUntil: 9 }],
      claimables: [
        { mint: "MintA", name: "Aurora", symbol: "AUR", kind: "vesting", amount: 1.5, asset: "AUR" },
        { mint: "MintA", name: "Aurora", symbol: "AUR", kind: "redemption", amount: 3, asset: "cSOL" },
        { mint: "MintC", name: "Forge", symbol: "FRG", kind: "escrow", amount: 100, asset: "USDC" },
      ],
      openVotes: [
        {
          mint: "MintA",
          name: "Aurora",
          symbol: "AUR",
          kind: "liquidation",
          closesAt: 1_800,
          yesWeight: 40,
          noWeight: 10,
          quorumBps: 1000,
        },
      ],
    });

    expect(snapshot.totals).toEqual({
      holdingsUsd: 25,
      stakedCount: 1,
      claimableCount: 3,
      openVoteCount: 1,
    });
    expect(snapshot.holdings).toHaveLength(2);
    expect(snapshot.stakes[0]?.voterLockedUntil).toBe(9);
    expect(snapshot.claimables.map((item) => item.kind)).toEqual(["vesting", "redemption", "escrow"]);
    expect(snapshot.openVotes[0]?.kind).toBe("liquidation");
  });
});
