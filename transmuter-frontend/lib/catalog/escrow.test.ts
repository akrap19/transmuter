import { describe, expect, it } from "vitest";
import { evaluateEscrowDraw, releasedToDate } from "./escrow";
import { SCHEDULE_LINEAR_12M, SCHEDULE_NONE, SIX_MONTHS_SECS } from "./schedule";
import type { CoinEscrow } from "./types";

const TEAM = "TmPrev1111111111111111111111111111111111111";

const FORGE: CoinEscrow = {
  teamRecipient: TEAM,
  schedule: SCHEDULE_NONE,
  startTime: 1_745_800_000,
  fundedPrincipal: 1_000,
  alreadyDrawn: 760,
  advanceUnlocked: 0,
  status: "active",
};

describe("runway escrow", () => {
  it("releases scheduled USDC plus advance, still capped at principal", () => {
    expect(releasedToDate(FORGE, 1_746_000_000)).toBe(1_000);
    expect(releasedToDate({ ...FORGE, schedule: SCHEDULE_LINEAR_12M, startTime: 1_000, fundedPrincipal: 1_000_000, alreadyDrawn: 0 }, 1_000 + SIX_MONTHS_SECS)).toBe(
      Math.floor((1_000_000 * SIX_MONTHS_SECS) / (365 * 24 * 3600)),
    );
    expect(
      releasedToDate({ ...FORGE, fundedPrincipal: 100, alreadyDrawn: 0, advanceUnlocked: 40 }, 1_746_000_000),
    ).toBe(100);
  });

  it("lets the team recipient draw the unreleased remainder while ACTIVE", () => {
    expect(evaluateEscrowDraw(FORGE, TEAM, 1_746_000_000)).toEqual({ ok: true, amount: 240 });
  });

  it("blocks draw for anyone else, when halted, liquidated, unstamped, or already drawn", () => {
    expect(evaluateEscrowDraw(FORGE, "other", 1_746_000_000)).toEqual({ ok: false, reason: "recipient" });
    expect(evaluateEscrowDraw({ ...FORGE, status: "halted" }, TEAM, 1_746_000_000)).toEqual({
      ok: false,
      reason: "halted",
    });
    expect(evaluateEscrowDraw({ ...FORGE, status: "liquidated" }, TEAM, 1_746_000_000)).toEqual({
      ok: false,
      reason: "liquidated",
    });
    expect(evaluateEscrowDraw({ ...FORGE, startTime: 0 }, TEAM, 1_746_000_000)).toEqual({
      ok: false,
      reason: "notStarted",
    });
    expect(evaluateEscrowDraw({ ...FORGE, alreadyDrawn: 1_000 }, TEAM, 1_746_000_000)).toEqual({
      ok: false,
      reason: "zero",
    });
  });
});
