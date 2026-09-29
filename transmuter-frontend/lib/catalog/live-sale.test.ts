import { describe, expect, it } from "vitest";
import { liveSaleFromChain, usdcFromAtoms } from "./live-sale";

const NOW = 1_700_000_000;

describe("liveSaleFromChain", () => {
  it("builds the sale snapshot, user deposit, and progress from chain atoms", () => {
    const live = liveSaleFromChain({
      factoryStatus: 2,
      eolStatus: 0,
      targetRaise: BigInt("100000000000"),
      raisedUsdc: BigInt("61000000000"),
      salePrice: BigInt(420_000),
      saleEnd: NOW + 86_400,
      depositAmount: BigInt(250_000_000),
      now: NOW,
    });

    expect(usdcFromAtoms(BigInt(420_000))).toBe(0.42);
    expect(live).toEqual({
      status: "sale",
      saleProgressBps: 6100,
      sale: {
        capUsdc: 100_000,
        raisedUsdc: 61_000,
        remainingUsdc: 39_000,
        priceUsd: 0.42,
        closesAt: NOW + 86_400,
        depositsOpen: true,
        myDepositUsdc: 250,
      },
    });
  });

  it("closes deposits after sale end or when the cap is filled", () => {
    const closed = liveSaleFromChain({
      factoryStatus: 2,
      eolStatus: 0,
      targetRaise: { toString: () => "1000000" },
      raisedUsdc: 1_000_000,
      salePrice: 420_000,
      saleEnd: NOW,
      depositAmount: null,
      now: NOW,
    });

    expect(closed?.sale?.depositsOpen).toBe(false);
    expect(closed?.sale?.myDepositUsdc).toBe(0);
    expect(closed?.saleProgressBps).toBe(10_000);
    expect(closed?.sale?.remainingUsdc).toBe(0);
  });

  it("prefers voided, liquidating, and active over an older factory status", () => {
    expect(liveSaleFromChain(row(2, 2))?.status).toBe("voided");
    expect(liveSaleFromChain(row(3, 3))?.status).toBe("liquidating");
    expect(liveSaleFromChain(row(2, 1))?.status).toBe("active");
    expect(liveSaleFromChain(row(3, 1))?.sale).toBeNull();
  });

  it("returns null when neither account has a known status", () => {
    expect(liveSaleFromChain(row(9, null))).toBeNull();
  });
});

function row(factoryStatus: number | null, eolStatus: number | null) {
  return {
    factoryStatus,
    eolStatus,
    targetRaise: BigInt(0),
    raisedUsdc: BigInt(0),
    salePrice: BigInt(0),
    saleEnd: BigInt(0),
    depositAmount: null,
    now: NOW,
  };
}
