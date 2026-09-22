import { describe, expect, it } from "vitest";
import { evaluateSaleAction } from "./sale";

const SALE = {
  capUsdc: 100_000,
  raisedUsdc: 61_000,
  remainingUsdc: 39_000,
  priceUsd: 0.42,
  closesAt: 1_800_000_000,
  depositsOpen: true,
  myDepositUsdc: 250,
};

describe("evaluateSaleAction", () => {
  it("accepts a USDC deposit under the remaining sale cap while the sale is open", () => {
    expect(evaluateSaleAction("sale", SALE, 1_746_200_000, { kind: "deposit", amountUsdc: 1_000 })).toEqual({
      ok: true,
      amountUsdc: 1_000,
    });
  });

  it("rejects a deposit that exceeds remaining cap, a closed sale, or a non-sale status", () => {
    expect(evaluateSaleAction("sale", SALE, 1_746_200_000, { kind: "deposit", amountUsdc: 39_001 })).toEqual({
      ok: false,
      reason: "cap",
    });
    expect(evaluateSaleAction("sale", SALE, 1_800_000_000, { kind: "deposit", amountUsdc: 1 })).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(evaluateSaleAction("active", SALE, 1_746_200_000, { kind: "deposit", amountUsdc: 1 })).toEqual({
      ok: false,
      reason: "status",
    });
    expect(evaluateSaleAction("sale", SALE, 1_746_200_000, { kind: "deposit", amountUsdc: 0 })).toEqual({
      ok: false,
      reason: "amount",
    });
  });

  it("withdraws the full USDC credit until close and refuses an empty or closed book", () => {
    expect(evaluateSaleAction("sale", SALE, 1_746_200_000, { kind: "withdraw" })).toEqual({
      ok: true,
      amountUsdc: 250,
    });
    expect(evaluateSaleAction("sale", { ...SALE, myDepositUsdc: 0 }, 1_746_200_000, { kind: "withdraw" })).toEqual({
      ok: false,
      reason: "credit",
    });
    expect(evaluateSaleAction("sale", SALE, 1_800_000_000, { kind: "withdraw" })).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(evaluateSaleAction("sale", { ...SALE, depositsOpen: false }, 1_746_200_000, { kind: "withdraw" })).toEqual({
      ok: true,
      amountUsdc: 250,
    });
  });
});
