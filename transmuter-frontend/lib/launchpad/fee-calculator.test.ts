import { describe, expect, it } from "vitest";
import { calculateFees } from "./fee-calculator";
import { initialFeeState } from "./types";

const off = { daoAirdrop: false, burnFee: false, creatorFee: false };

describe("calculateFees", () => {
  it("does not warn when the default split uses the whole total", () => {
    const fees = calculateFees({
      totalFee: initialFeeState.totalFee,
      lpFee: initialFeeState.lpFee,
      treasuryFee: initialFeeState.treasuryFee,
      burnFee: initialFeeState.burnFee,
      creatorFee: initialFeeState.creatorFee,
      toggles: off,
    });

    expect(fees.feeWarning).toBe(false);
    expect(fees.feeGap).toBe(0);
    expect(fees.lpFee + fees.treasuryFee + 0.15 + 0.05).toBeCloseTo(0.5, 5);
  });

  it("warns when the total is raised and the remainder is left unallocated", () => {
    const fees = calculateFees({
      totalFee: 1,
      lpFee: 0.15,
      treasuryFee: 0.2,
      burnFee: 0,
      creatorFee: 0,
      toggles: off,
      changed: "total",
    });

    expect(fees.feeWarning).toBe(true);
    expect(fees.feeGap).toBeCloseTo(0.45, 5);
  });

  it("caps a destination that would exceed the total and does not warn once it fits", () => {
    const fees = calculateFees({
      totalFee: 0.6,
      lpFee: 0.15,
      treasuryFee: 0.5,
      burnFee: 0,
      creatorFee: 0,
      toggles: off,
      changed: "treasury",
    });

    expect(fees.treasuryFee).toBeCloseTo(0.25, 5);
    expect(fees.feeWarning).toBe(false);
    expect(fees.feeGap).toBe(0);
  });
});
