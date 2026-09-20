import { describe, expect, it } from "vitest";
import { getCoinByMint, getCoinChart, getCoinDetail, getPortfolio, listCoins, listCreated, listHeld } from "./client";
import { MOCK_PREVIEW_WALLET } from "./mock";

describe("catalog client", () => {
  it("resolves a mint from the mock index", () => {
    expect(getCoinByMint("MintHelix111111111111111111111111111111111")?.symbol).toBe("HLX");
    expect(getCoinByMint("unknown")).toBeNull();
  });

  it("lists every indexed launch including VOIDED", () => {
    const result = listCoins({});

    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.items.some((item) => item.status === "voided")).toBe(true);
  });

  it("splits the preview wallet into created launches and held EOL mints", () => {
    const created = listCreated(MOCK_PREVIEW_WALLET);
    const held = listHeld(MOCK_PREVIEW_WALLET);

    expect(created.length).toBeGreaterThan(0);
    expect(created.every((item) => item.creator === MOCK_PREVIEW_WALLET)).toBe(true);
    expect(held.length).toBeGreaterThan(0);
    expect(held.every((item) => item.amount > 0)).toBe(true);
  });

  it("loads Helix overview with treasury that counts unconverted USDC and socials", () => {
    const detail = getCoinDetail("MintHelix111111111111111111111111111111111");

    expect(detail?.symbol).toBe("HLX");
    expect(detail?.priceUsd).toBe(2.15);
    expect(detail?.marketCapUsd).toBe(860_000);
    expect(detail?.backingRatioBps).toBe(2140);
    expect(detail?.saleProgressBps).toBe(0);
    expect(detail?.logoUrl).toBe("https://cdn.transmuter.test/helix.png");
    expect(detail?.socials).toEqual({
      website: "https://helix.example",
      twitter: "https://x.com/helix",
      telegram: "https://t.me/helix",
      discord: "https://discord.gg/helix",
    });
    expect(detail?.treasury.unconvertedUsdc).toBe(8_000);
    expect(detail?.treasury.backingValueUsd).toBe(80_000);
    expect(detail?.treasury.cTokenAmount).toBe(400);
  });

  it("returns Helix price/volume history and nothing for an unknown mint", () => {
    const chart = getCoinChart("MintHelix111111111111111111111111111111111");

    expect(chart.length).toBeGreaterThanOrEqual(3);
    expect(chart[0]).toEqual({ t: 1_745_000_000, priceUsd: 1.8, volumeUsd: 12_400 });
    expect(getCoinChart("unknown")).toEqual([]);
  });

  it("loads Aurora sale cap, remaining USDC, and the preview wallet deposit", () => {
    const detail = getCoinDetail("MintAurora11111111111111111111111111111111", MOCK_PREVIEW_WALLET);

    expect(detail?.status).toBe("sale");
    expect(detail?.sale).toEqual({
      capUsdc: 100_000,
      raisedUsdc: 61_000,
      remainingUsdc: 39_000,
      priceUsd: 0.42,
      closesAt: 1_800_000_000,
      depositsOpen: true,
      myDepositUsdc: 250,
    });
    expect(detail?.trade).toBeNull();
  });

  it("does not invent created coins, holdings, or votes for an unknown wallet", () => {
    expect(listCreated("UnknownWallet111111111111111111111111111")).toEqual([]);
    expect(listHeld("UnknownWallet111111111111111111111111111")).toEqual([]);
    expect(getPortfolio("UnknownWallet111111111111111111111111111").totals).toEqual({
      holdingsUsd: 0,
      stakedCount: 0,
      claimableCount: 0,
      openVoteCount: 0,
    });
  });

  it("intersects supplied token accounts with indexed EOL mints", () => {
    const held = listHeld("any-wallet", [
      { mint: "MintHelix111111111111111111111111111111111", amount: 3 },
      { mint: "NotAnEolMint11111111111111111111111111111", amount: 99 },
    ]);

    expect(held).toEqual([expect.objectContaining({ symbol: "HLX", amount: 3 })]);
  });

  it("returns holdings, stakes, claimables, and open votes for the preview wallet", () => {
    const portfolio = getPortfolio(MOCK_PREVIEW_WALLET);

    expect(portfolio.holdings.length).toBeGreaterThan(0);
    expect(portfolio.stakes.length).toBeGreaterThan(0);
    expect(portfolio.claimables.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["vesting", "redemption", "escrow"]),
    );
    expect(portfolio.openVotes.some((vote) => vote.kind === "liquidation")).toBe(true);
    expect(portfolio.totals.openVoteCount).toBe(portfolio.openVotes.length);
  });

  it("loads Helix stake weight and voter-lock for the preview wallet", () => {
    const detail = getCoinDetail("MintHelix111111111111111111111111111111111", MOCK_PREVIEW_WALLET);

    expect(detail?.stake).toEqual({
      staked: 10,
      weight: 10,
      voterLockedUntil: 1_800_600_000,
      walletBalance: 40,
      feeBps: 0,
      liquidated: false,
    });
    expect(detail?.votes).toEqual([
      expect.objectContaining({
        kind: "escrow_halt",
        denom: 40_000,
        passBps: 5_500,
        quorumBps: 1_000,
      }),
    ]);
  });

  it("loads Solace liquidation and Forge Path B against circulating denom, not staked supply", () => {
    const solace = getCoinDetail("MintSolace1111111111111111111111111111111");
    const forge = getCoinDetail("MintForge11111111111111111111111111111111");

    expect(solace?.status).toBe("liquidating");
    expect(solace?.stake?.liquidated).toBe(true);
    expect(solace?.votes).toEqual([
      {
        kind: "liquidation",
        closesAt: 1_800_500_000,
        yesWeight: 5_200,
        noWeight: 800,
        quorumBps: 1_000,
        passBps: 6_700,
        denom: 15_000,
      },
    ]);
    expect(forge?.treasury.reserveMint.governedPct).toBe(5);
    expect(forge?.votes).toEqual([
      {
        kind: "reserve_mint",
        closesAt: 1_800_400_000,
        yesWeight: 4_200,
        noWeight: 6_800,
        quorumBps: 300,
        passBps: 5_500,
        denom: 20_000,
      },
    ]);
    expect(getCoinDetail("MintAurora11111111111111111111111111111111")?.stake).toBeNull();
    expect(getCoinDetail("MintAurora11111111111111111111111111111111")?.votes).toEqual([]);
  });
});
