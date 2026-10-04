import { describe, expect, it } from "vitest";
import { depositReadMatches, saleSectionState, settleChainRead, treasurySectionState } from "./chain-read";

const WALLET = "7r9CHkGP8C2d3c58o12355othUh42rqR92uXQNCR62Si";

describe("settleChainRead", () => {
  it("keeps the last successful snapshot when a newer read fails", () => {
    expect(settleChainRead({ raised: 5 }, null, 2, 2)).toEqual({ raised: 5 });
  });

  it("drops a slow response once a later read has started", () => {
    expect(settleChainRead({ raised: 5, deposit: 5 }, { raised: 5, deposit: 0 }, 1, 2)).toEqual({
      raised: 5,
      deposit: 5,
    });
  });

  it("applies a fresh successful read", () => {
    expect(settleChainRead({ raised: 0 }, { raised: 5 }, 3, 3)).toEqual({ raised: 5 });
  });
});

describe("saleSectionState", () => {
  it("keeps the sale section in a loading state until the chain snapshot arrives", () => {
    expect(saleSectionState("sale", false)).toBe("loading");
  });

  it("shows the sale once the snapshot is present", () => {
    expect(saleSectionState("sale", true)).toBe("ready");
  });

  it("stays hidden for launches that are not in sale", () => {
    expect(saleSectionState("active", false)).toBe("hidden");
  });
});

describe("treasurySectionState", () => {
  it("loads the treasury for a wired launch until the chain read lands", () => {
    for (const status of ["wired", "sale", "active", "voided", "liquidating"]) {
      expect(treasurySectionState(status, false, false)).toBe("loading");
    }
  });

  it("shows the treasury once the read has landed", () => {
    expect(treasurySectionState("sale", true, true)).toBe("ready");
  });

  it("stays hidden when the launch has no treasury yet", () => {
    expect(treasurySectionState("created", false, false)).toBe("hidden");
  });

  it("stays hidden when the chain confirms there is no treasury account", () => {
    expect(treasurySectionState("sale", true, false)).toBe("hidden");
  });
});

describe("depositReadMatches", () => {
  it("treats a missing wallet as nothing to look up", () => {
    expect(depositReadMatches(null, null)).toBe(true);
  });

  it("does not treat a no-wallet snapshot as this wallet's deposit", () => {
    expect(depositReadMatches(WALLET, null)).toBe(false);
  });

  it("accepts the snapshot read for the connected wallet", () => {
    expect(depositReadMatches(WALLET, WALLET)).toBe(true);
  });
});
