import { describe, expect, it } from "vitest";
import { formatBps, formatStatus, formatUsd } from "./format";

describe("catalog formatters", () => {
  it("renders USD, basis points, and launch status for the table", () => {
    expect(formatUsd(25)).toBe("$25.00");
    expect(formatUsd(null)).toBe("—");
    expect(formatBps(1800)).toBe("18%");
    expect(formatBps(null)).toBe("—");
    expect(formatStatus("voided")).toBe("VOIDED");
  });
});
