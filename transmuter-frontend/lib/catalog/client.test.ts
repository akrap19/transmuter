import { describe, expect, it } from "vitest";
import { getPortfolio, listCoins, listCreated, listHeld } from "./client";
import { MOCK_PREVIEW_WALLET } from "./mock";

describe("catalog client", () => {
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
});
