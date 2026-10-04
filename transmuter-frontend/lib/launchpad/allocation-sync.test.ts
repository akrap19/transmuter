import { describe, expect, it } from "vitest";
import { getAllocationTotal, syncAllocation } from "./allocation-sync";
import type { AllocationState } from "./types";

function allocation(overrides: Partial<AllocationState> = {}): AllocationState {
  return {
    allocLP: 20,
    allocTeam: 10,
    allocPublic: 70,
    allocInvestors: 0,
    showInvestors: false,
    daoAirdropPct: 2,
    daoAirdrop: false,
    ...overrides,
  };
}

describe("syncAllocation", () => {
  it("gives the DAO percent back to team when the airdrop is turned off", () => {
    const on = syncAllocation(allocation({ daoAirdrop: true }), "dao");
    expect(getAllocationTotal({ ...on, daoAirdrop: true, daoAirdropPct: 2 })).toBe(100);
    expect(on.allocTeam).toBe(8);

    const off = syncAllocation({ ...on, daoAirdrop: false }, "dao");
    expect(off.allocTeam).toBe(10);
    expect(getAllocationTotal(off)).toBe(100);
  });
});
