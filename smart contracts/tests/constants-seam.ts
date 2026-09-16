import { expect } from "chai";
import { FOUNDER, readRustConstants } from "./read-constants";

describe("transmuter-constants seam (founder rulings)", () => {
  it("pins 1.25% premium, 10% ask vs 8% accept, 18% combined — not 1.85% / 25%", () => {
    const c = readRustConstants();
    expect(c.MINT_PREMIUM_RATE_BPS).to.equal(FOUNDER.MINT_PREMIUM_RATE_BPS);
    expect(c.UNDERLYING_PREMIUM_RATE_BPS).to.equal(FOUNDER.UNDERLYING_PREMIUM_RATE_BPS);
    expect(c.PROTOCOL_PREMIUM_RATE_BPS).to.equal(FOUNDER.PROTOCOL_PREMIUM_RATE_BPS);
    expect(c.UNDERLYING_PREMIUM_RATE_BPS + c.PROTOCOL_PREMIUM_RATE_BPS).to.equal(
      c.MINT_PREMIUM_RATE_BPS,
    );
    expect(c.TREASURY_MIN_PCT).to.equal(FOUNDER.TREASURY_MIN_PCT);
    expect(c.TREASURY_ACCEPT_PCT).to.equal(FOUNDER.TREASURY_ACCEPT_PCT);
    expect(c.TREASURY_MIN_PCT).to.not.equal(c.TREASURY_ACCEPT_PCT);
    expect(c.COMBINED_BACKING_MIN_PCT).to.equal(FOUNDER.COMBINED_BACKING_MIN_PCT);
    expect(c.MAX_COMPUTE_UNITS).to.equal(FOUNDER.MAX_COMPUTE_UNITS);
    expect(c.NON_TRANSFERABLE_MINT_SPACE).to.equal(FOUNDER.NON_TRANSFERABLE_MINT_SPACE);
  });
});
