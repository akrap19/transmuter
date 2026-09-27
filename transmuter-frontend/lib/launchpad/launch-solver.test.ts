import { describe, expect, it } from "vitest";
import { launchSolve } from "./launch-solver";

describe("launchSolve treasury backing", () => {
  it("sizes the raise so 20% LP and 100k escrow land a 20% treasury", () => {
    const solved = launchSolve({
      tokenSupply: 100_000_000,
      escrowNeed: 100_000,
      allocLP: 20,
      allocPublic: 70,
      targetRaise: null,
      treasuryAsk: 0.2,
    });

    expect(solved?.feasible).toBe(true);
    expect(solved?.minRaise).toBeCloseTo(233_333.33, 0);
    expect(solved?.treasPctMCP).toBeCloseTo(0.2, 5);
  });

  it("keeps 10% as the floor when a lower ask is passed", () => {
    const solved = launchSolve({
      tokenSupply: 100_000_000,
      escrowNeed: 100_000,
      allocLP: 20,
      allocPublic: 70,
      targetRaise: null,
      treasuryAsk: 0.05,
    });

    expect(solved?.treasPctMCP).toBeCloseTo(0.1, 5);
  });
});
