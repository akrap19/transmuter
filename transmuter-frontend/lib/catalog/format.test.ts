import { describe, expect, it } from "vitest";
import { formatBps, formatRemaining, formatStatus, formatUsd } from "./format";

describe("catalog formatters", () => {
  it("renders USD, basis points, and launch status for the table", () => {
    expect(formatUsd(25)).toBe("$25.00");
    expect(formatUsd(null)).toBe("—");
    expect(formatBps(1800)).toBe("18%");
    expect(formatBps(null)).toBe("—");
    expect(formatStatus("voided")).toBe("VOIDED");
    expect(formatStatus("liquidating")).toBe("END OF LIFE");
  });

  it("renders time left until the sale closes", () => {
    const now = 1_700_000_000;
    expect(formatRemaining(now + 2 * 86_400 + 3 * 3_600, now)).toBe("2d 3h");
    expect(formatRemaining(now + 5 * 3_600 + 12 * 60, now)).toBe("5h 12m");
    expect(formatRemaining(now + 90, now)).toBe("1m 30s");
    expect(formatRemaining(now, now)).toBe("Closed");
    expect(formatRemaining(now - 10, now)).toBe("Closed");
  });
});
