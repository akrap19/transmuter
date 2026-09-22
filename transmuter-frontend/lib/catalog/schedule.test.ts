import { describe, expect, it } from "vitest";
import {
  EIGHTEEN_MONTHS_SECS,
  SCHEDULE_CLIFF_6M,
  SCHEDULE_CLIFF_6M_LINEAR_18M,
  SCHEDULE_LINEAR_12M,
  SCHEDULE_LINEAR_24M,
  SCHEDULE_NONE,
  SIX_MONTHS_SECS,
  TWELVE_MONTHS_SECS,
  scheduleKindOk,
  scheduleLabel,
  vestedAmount,
} from "./schedule";

describe("vesting and escrow schedules", () => {
  it("accepts the five Factory presets and rejects anything else", () => {
    expect(scheduleKindOk(SCHEDULE_NONE)).toBe(true);
    expect(scheduleKindOk(SCHEDULE_CLIFF_6M_LINEAR_18M)).toBe(true);
    expect(scheduleKindOk(5)).toBe(false);
  });

  it("labels presets the same way the Launchpad snapshots them", () => {
    expect(scheduleLabel(SCHEDULE_NONE)).toBe("None");
    expect(scheduleLabel(SCHEDULE_CLIFF_6M)).toBe("6 Month Cliff");
    expect(scheduleLabel(SCHEDULE_LINEAR_12M)).toBe("12 Month Linear");
    expect(scheduleLabel(SCHEDULE_LINEAR_24M)).toBe("24 Month Linear");
    expect(scheduleLabel(SCHEDULE_CLIFF_6M_LINEAR_18M)).toBe("6M Cliff + 18M Linear");
  });

  it("pays none immediately after start, and nothing before start or while unstamped", () => {
    expect(vestedAmount(1_000, 10, 10, SCHEDULE_NONE)).toBe(1_000);
    expect(vestedAmount(1_000, 10, 9, SCHEDULE_NONE)).toBe(0);
    expect(vestedAmount(1_000, 0, 50, SCHEDULE_NONE)).toBe(0);
  });

  it("floors 12-month linear at six months the same way the chain does", () => {
    const start = 1_000;
    const mid = start + SIX_MONTHS_SECS;
    expect(vestedAmount(1_000_000, start, mid, SCHEDULE_LINEAR_12M)).toBe(
      Math.floor((1_000_000 * SIX_MONTHS_SECS) / TWELVE_MONTHS_SECS),
    );
  });

  it("keeps a 6-month cliff at zero until the cliff, then pays in full", () => {
    expect(vestedAmount(500, 10, 10 + SIX_MONTHS_SECS - 1, SCHEDULE_CLIFF_6M)).toBe(0);
    expect(vestedAmount(500, 10, 10 + SIX_MONTHS_SECS, SCHEDULE_CLIFF_6M)).toBe(500);
  });

  it("starts 6M+18M linear only after the cliff", () => {
    const start = 100;
    expect(vestedAmount(1_800, start, start + SIX_MONTHS_SECS - 1, SCHEDULE_CLIFF_6M_LINEAR_18M)).toBe(0);
    expect(
      vestedAmount(1_800, start, start + SIX_MONTHS_SECS + EIGHTEEN_MONTHS_SECS, SCHEDULE_CLIFF_6M_LINEAR_18M),
    ).toBe(1_800);
  });
});
