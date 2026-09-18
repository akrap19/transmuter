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
    expect(c.TRANSFER_FEE_MINT_SPACE).to.equal(FOUNDER.TRANSFER_FEE_MINT_SPACE);
    expect(c.SH2_MAX_SLIPPAGE_BPS).to.equal(FOUNDER.SH2_MAX_SLIPPAGE_BPS);
    expect(c.ORACLE_MAX_STALENESS_SECS).to.equal(FOUNDER.ORACLE_MAX_STALENESS_SECS);
    expect(c.ORACLE_MAX_CONF_BPS).to.equal(FOUNDER.ORACLE_MAX_CONF_BPS);
    expect(
      c.FEE_LP_DEFAULT_BPS +
        c.FEE_TREASURY_DEFAULT_BPS +
        c.FEE_CTOKEN_RESERVE_BPS +
        c.FEE_PROTOCOL_MIN_BPS,
    ).to.equal(c.TRANSFER_FEE_DEFAULT_BPS);
    expect(c.LIQUIDATION_FEE_CTOKEN_BPS + c.LIQUIDATION_FEE_PROTOCOL_BPS).to.equal(
      c.LIQUIDATION_FEE_BPS,
    );
    expect(c.LIQUIDATION_FEE_CTOKEN_BPS).to.not.equal(150);
    expect(c.VOTE_SENSITIVE).to.equal(FOUNDER.VOTE_SENSITIVE);
    expect(c.VOTE_LIQ_DAO).to.equal(FOUNDER.VOTE_LIQ_DAO);
    expect(c.VOTE_GATE1_FALLBACK).to.equal(FOUNDER.VOTE_GATE1_FALLBACK);
    expect(c.VOTE_GATE1_FALLBACK).to.equal(10);
  });
});

