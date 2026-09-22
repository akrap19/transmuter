import { describe, expect, it } from "vitest";
import { evaluateVestingClaim, vestedForEntry } from "./vesting";
import { SCHEDULE_LINEAR_12M, SCHEDULE_NONE, SIX_MONTHS_SECS } from "./schedule";
import type { CoinVesting } from "./types";

const TEAM: CoinVesting = {
  recipient: "TmPrev1111111111111111111111111111111111111",
  kind: "team",
  schedule: SCHEDULE_NONE,
  startTime: 1_745_800_000,
  liquidationTimestamp: 0,
  totalAllocation: 500,
  alreadyClaimed: 0,
};

describe("vesting claims", () => {
  it("pays the live schedule until liquidation, then TEAM is capped at the write-down total", () => {
    const start = 1_000;
    const now = start + SIX_MONTHS_SECS;
    const linear: CoinVesting = { ...TEAM, schedule: SCHEDULE_LINEAR_12M, startTime: start, totalAllocation: 1_000_000 };
    expect(vestedForEntry(linear, now)).toBeGreaterThan(0);
    expect(vestedForEntry(linear, now)).toBeLessThan(1_000_000);
    expect(
      vestedForEntry({ ...linear, kind: "team", liquidationTimestamp: now, totalAllocation: 400_000 }, now + 1),
    ).toBe(400_000);
    expect(
      vestedForEntry({ ...linear, kind: "investor", liquidationTimestamp: now, totalAllocation: 1_000_000 }, now + 1),
    ).toBeGreaterThan(400_000);
  });

  it("claims vested minus already claimed for the recipient after startTime", () => {
    expect(evaluateVestingClaim(TEAM, "TmPrev1111111111111111111111111111111111111", 1_746_000_000)).toEqual({
      ok: true,
      amount: 500,
    });
    expect(evaluateVestingClaim({ ...TEAM, alreadyClaimed: 200 }, "TmPrev1111111111111111111111111111111111111", 1_746_000_000)).toEqual({
      ok: true,
      amount: 300,
    });
  });

  it("rejects another wallet, an unstamped start, or a fully claimed entry", () => {
    expect(evaluateVestingClaim(TEAM, "someone-else", 1_746_000_000)).toEqual({ ok: false, reason: "recipient" });
    expect(evaluateVestingClaim({ ...TEAM, startTime: 0 }, TEAM.recipient, 1_746_000_000)).toEqual({
      ok: false,
      reason: "notStarted",
    });
    expect(evaluateVestingClaim({ ...TEAM, alreadyClaimed: 500 }, TEAM.recipient, 1_746_000_000)).toEqual({
      ok: false,
      reason: "zero",
    });
  });
});
