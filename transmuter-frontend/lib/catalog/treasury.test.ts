import { describe, expect, it } from "vitest";
import { redemptionRatio, treasuryBackingUsd } from "./treasury";

describe("treasury backing", () => {
  it("adds unconverted USDC into backing value and keeps redemption quantity-based", () => {
    expect(treasuryBackingUsd({ cTokenAmount: 100, cTokenPriceUsd: 150, unconvertedUsdc: 5_000 })).toBe(20_000);
    expect(treasuryBackingUsd({ cTokenAmount: 100, cTokenPriceUsd: 150, unconvertedUsdc: 0 })).toBe(15_000);
    expect(redemptionRatio(100_000, 1_000_000)).toBe(0.1);
    expect(redemptionRatio(10, 0)).toBe(0);
  });
});
