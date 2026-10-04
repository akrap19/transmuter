import { describe, expect, it } from "vitest";
import { launchSolve } from "./launch-solver";
import { fundProceedsReady } from "./public-fund";

describe("fundProceedsReady", () => {
  it("stays true when a feasible launch has a zero runway share", () => {
    const solved = launchSolve({
      tokenSupply: 100_000_000,
      escrowNeed: 0,
      allocLP: 20,
      allocPublic: 70,
      targetRaise: 100_000,
      treasuryAsk: 0.1,
    });

    expect(solved?.feasible).toBe(true);
    expect(solved?.escrowFrac).toBe(0);
    expect(fundProceedsReady(solved)).toBe(true);
  });

  it("stays true when the liquidity-pool share is zero", () => {
    const solved = launchSolve({
      tokenSupply: 100_000_000,
      escrowNeed: 10_000,
      allocLP: 0,
      allocPublic: 70,
      targetRaise: 100_000,
      treasuryAsk: 0.1,
    });

    expect(solved?.feasible).toBe(true);
    expect(solved?.lpFrac).toBe(0);
    expect(fundProceedsReady(solved)).toBe(true);
  });

  it("stays false when the sale cannot fund the treasury ask", () => {
    const solved = launchSolve({
      tokenSupply: 100_000_000,
      escrowNeed: 0,
      allocLP: 50,
      allocPublic: 40,
      targetRaise: 100_000,
      treasuryAsk: 0.1,
    });

    expect(fundProceedsReady(solved)).toBe(false);
  });

  it("stays false before there is a solve", () => {
    expect(fundProceedsReady(null)).toBe(false);
  });
});
