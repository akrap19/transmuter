import { describe, expect, it } from "vitest";
import { evaluateStakeAction, grossUp, stakingAvailable, voterLocked } from "./stake";
import type { CoinStake } from "./types";

const HELIX: CoinStake = {
  staked: 10,
  weight: 10,
  voterLockedUntil: 1_747_200_000,
  walletBalance: 40,
  feeBps: 0,
  liquidated: false,
};

describe("staking", () => {
  it("is offered after finalize and stays open for unstake through liquidation", () => {
    expect(stakingAvailable("sale")).toBe(false);
    expect(stakingAvailable("voided")).toBe(false);
    expect(stakingAvailable("active")).toBe(true);
    expect(stakingAvailable("liquidating")).toBe(true);
  });

  it("treats stake and unstake as free, with gross-up a no-op at fee_bps 0", () => {
    expect(grossUp(10, 0)).toBe(10);
    expect(grossUp(100, 50)).toBeGreaterThan(100);
  });

  it("locks unstake until the voter-lock timestamp and unlocks after", () => {
    expect(voterLocked(null, 1_747_000_000)).toBe(false);
    expect(voterLocked(1_747_200_000, 1_747_000_000)).toBe(true);
    expect(voterLocked(1_747_200_000, 1_747_200_000)).toBe(false);
  });

  it("accepts a stake from wallet balance while the launch is active", () => {
    expect(evaluateStakeAction("active", HELIX, 1_746_000_000, { kind: "stake", amount: 5 })).toEqual({
      ok: true,
      amount: 5,
      gross: 5,
    });
  });

  it("rejects a stake that exceeds wallet balance, is zero, or lands after liquidation", () => {
    expect(evaluateStakeAction("active", HELIX, 1_746_000_000, { kind: "stake", amount: 41 })).toEqual({
      ok: false,
      reason: "balance",
    });
    expect(evaluateStakeAction("active", HELIX, 1_746_000_000, { kind: "stake", amount: 0 })).toEqual({
      ok: false,
      reason: "amount",
    });
    expect(
      evaluateStakeAction("liquidating", { ...HELIX, liquidated: true }, 1_746_000_000, {
        kind: "stake",
        amount: 1,
      }),
    ).toEqual({ ok: false, reason: "liquidated" });
    expect(evaluateStakeAction("sale", HELIX, 1_746_000_000, { kind: "stake", amount: 1 })).toEqual({
      ok: false,
      reason: "status",
    });
  });

  it("unstakes only after the lock expires, to the staking account, and still after liquidation", () => {
    expect(evaluateStakeAction("active", HELIX, 1_747_000_000, { kind: "unstake", amount: 4 })).toEqual({
      ok: false,
      reason: "lock",
    });
    expect(evaluateStakeAction("active", HELIX, 1_747_200_000, { kind: "unstake", amount: 4 })).toEqual({
      ok: true,
      amount: 4,
      gross: 4,
    });
    expect(evaluateStakeAction("active", HELIX, 1_747_200_000, { kind: "unstake", amount: 11 })).toEqual({
      ok: false,
      reason: "credit",
    });
    expect(
      evaluateStakeAction("liquidating", { ...HELIX, liquidated: true, voterLockedUntil: null }, 1_747_200_000, {
        kind: "unstake",
        amount: 4,
      }),
    ).toEqual({ ok: true, amount: 4, gross: 4 });
  });
});
