import { describe, expect, it } from "vitest";
import { backingFromChain, oracleToUsdcAtoms } from "./backing";

describe("backingFromChain", () => {
  it("counts cToken, SOL residue, and unconverted USDC in the backing read", () => {
    expect(oracleToUsdcAtoms(BigInt(150_000_000), -8)).toBe(BigInt(1_500_000));

    const view = backingFromChain({
      ctokenAtoms: BigInt(2_000_000_000),
      unconvertedUsdcAtoms: BigInt(5_000_000),
      solResidueLamports: BigInt(1_000_000_000),
      oraclePrice: BigInt(150_000_000),
      oracleExpo: -8,
      circulatingAtoms: BigInt(10_000_000_000_000),
      totalSupplyAtoms: BigInt(19_000_000_000),
      salePriceAtoms: BigInt(1_000_000),
      decimals: 9,
      governedMintPctBps: 500,
      pathAReady: true,
      pathBActivated: true,
    });

    expect(view.treasury.cTokenAmount).toBe(2);
    expect(view.treasury.unconvertedUsdc).toBe(5);
    expect(view.treasury.cTokenPriceUsd).toBe(1.5);
    expect(view.treasury.backingValueUsd).toBe(9.5);
    expect(view.treasury.redemptionRatio).toBe(2 / 10_000);
    expect(view.backingRatioBps).toBe(5000);
    expect(view.priceUsd).toBe(1);
    expect(view.marketCapUsd).toBe(10_000);
    expect(view.treasury.reserveMint).toEqual({
      pathAReady: true,
      pathBActivated: true,
      governedPct: 5,
      mintsThisYear: 0,
      yearlyCap: 3,
    });
  });

  it("still counts unconverted USDC when the SOL oracle is missing", () => {
    const view = backingFromChain({
      ctokenAtoms: BigInt(2_000_000_000),
      unconvertedUsdcAtoms: BigInt(5_000_000),
      solResidueLamports: BigInt(1_000_000_000),
      oraclePrice: BigInt(0),
      oracleExpo: -8,
      circulatingAtoms: BigInt(0),
      totalSupplyAtoms: BigInt(0),
      salePriceAtoms: BigInt(1_000_000),
      decimals: 9,
      governedMintPctBps: 0,
      pathAReady: false,
      pathBActivated: false,
    });

    expect(view.treasury.backingValueUsd).toBe(5);
    expect(view.treasury.cTokenPriceUsd).toBe(0);
    expect(view.backingRatioBps).toBeNull();
    expect(view.treasury.redemptionRatio).toBe(0);
  });

  it("reports an unknown backing ratio when the oracle cannot price held cToken", () => {
    const view = backingFromChain({
      ctokenAtoms: BigInt(2_000_000_000),
      unconvertedUsdcAtoms: BigInt(0),
      solResidueLamports: BigInt(0),
      oraclePrice: BigInt(0),
      oracleExpo: -8,
      circulatingAtoms: BigInt(100_000_000_000_000),
      totalSupplyAtoms: BigInt(100_000_000_000_000),
      salePriceAtoms: BigInt(70_000),
      decimals: 9,
      governedMintPctBps: 1_000,
      pathAReady: false,
      pathBActivated: false,
    });

    // cToken is held but the oracle mark is 0, so the ratio is unknown, not 0%.
    expect(view.backingRatioBps).toBeNull();
    expect(view.priceUsd).toBe(0.07);
    expect(view.marketCapUsd).toBeCloseTo(7_000, 5);
  });
});
