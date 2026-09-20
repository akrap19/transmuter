import { describe, expect, it } from "vitest";
import { buildPortfolio, holdingsFromCoins } from "./portfolio";

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

  it("prices held EOL balances from the catalog, leaving null price as unknown", () => {
    expect(
      holdingsFromCoins([
        {
          mint: "MintA",
          name: "Aurora",
          symbol: "AUR",
          creator: "C",
          backing: "cSOL",
          status: "active",
          priceUsd: 2.15,
          marketCapUsd: 1,
          backingRatioBps: 1800,
          saleProgressBps: 0,
          holderCount: 1,
          launchedAt: 1,
          logoUrl: null,
          metadataUri: null,
          amount: 40,
        },
        {
          mint: "MintV",
          name: "Nimbus",
          symbol: "NMB",
          creator: "C",
          backing: "cSOL",
          status: "voided",
          priceUsd: null,
          marketCapUsd: null,
          backingRatioBps: null,
          saleProgressBps: 0,
          holderCount: 0,
          launchedAt: 1,
          logoUrl: null,
          metadataUri: null,
          amount: 3,
        },
      ]),
    ).toEqual([
      { mint: "MintA", name: "Aurora", symbol: "AUR", amount: 40, valueUsd: 86 },
      { mint: "MintV", name: "Nimbus", symbol: "NMB", amount: 3, valueUsd: null },
    ]);
  });
});
