import { describe, expect, it } from "vitest";
import {
  REDEMPTION_TREASURY_FEE_BPS,
  evaluateRedeemAction,
  quoteRedeem,
  redeemAvailable,
  unpaidLegs,
} from "./redeem";
import type { CoinRedeem } from "./types";

const HELIX: CoinRedeem = {
  walletBalance: 40,
  circulatingSupply: 40_000,
  cTokenTreasury: 400,
  unconvertedUsdc: 8_000,
  escrowUsdc: 0,
  treasuryFeeBps: REDEMPTION_TREASURY_FEE_BPS,
  treasuryCsolAvailable: 400,
  treasuryUsdcAvailable: 8_000,
  legs: [
    { asset: "cSOL", owed: 0, paid: 0 },
    { asset: "USDC", owed: 0, paid: 0 },
  ],
};

const SOLACE: CoinRedeem = {
  ...HELIX,
  walletBalance: 8,
  circulatingSupply: 15_000,
  cTokenTreasury: 160,
  unconvertedUsdc: 1_200,
  escrowUsdc: 300,
  treasuryCsolAvailable: 160,
  treasuryUsdcAvailable: 10,
  legs: [
    { asset: "cSOL", owed: 1.2, paid: 1.2 },
    { asset: "USDC", owed: 80, paid: 0 },
  ],
};

describe("EOL redemption", () => {
  it("stays open after finalize and through liquidation", () => {
    expect(redeemAvailable("sale")).toBe(false);
    expect(redeemAvailable("voided")).toBe(false);
    expect(redeemAvailable("active")).toBe(true);
    expect(redeemAvailable("liquidating")).toBe(true);
  });

  it("quotes pro-rata cSOL after the 35 bps treasury fee and USDC that counts unconverted plus returned escrow", () => {
    expect(quoteRedeem(HELIX, 1_000)).toEqual({
      grossCsol: 10,
      treasuryFee: 0.035,
      csolOwed: 9.965,
      usdcOwed: 200,
    });
    expect(quoteRedeem({ ...HELIX, escrowUsdc: 2_000 }, 1_000).usdcOwed).toBe(250);
  });

  it("accepts a redeem of wallet balance while active and records both legs", () => {
    expect(evaluateRedeemAction("active", HELIX, { kind: "redeem", amount: 10 })).toEqual({
      ok: true,
      amount: 10,
      csolOwed: 0.09965,
      usdcOwed: 2,
      paid: { cSOL: 0.09965, USDC: 2 },
      stuck: { cSOL: false, USDC: false },
    });
  });

  it("rejects a redeem that exceeds balance, is zero, or lands before finalize", () => {
    expect(evaluateRedeemAction("active", HELIX, { kind: "redeem", amount: 41 })).toEqual({
      ok: false,
      reason: "balance",
    });
    expect(evaluateRedeemAction("active", HELIX, { kind: "redeem", amount: 0 })).toEqual({
      ok: false,
      reason: "amount",
    });
    expect(evaluateRedeemAction("sale", HELIX, { kind: "redeem", amount: 1 })).toEqual({
      ok: false,
      reason: "status",
    });
  });

  it("pays a cSOL leg independently of a stuck USDC leg and lists remaining unpaid", () => {
    expect(unpaidLegs(SOLACE)).toEqual([{ asset: "USDC", owed: 80, paid: 0, remaining: 80 }]);
    expect(evaluateRedeemAction("liquidating", SOLACE, { kind: "claim_legs" })).toEqual({
      ok: true,
      amount: 0,
      csolOwed: 0,
      usdcOwed: 0,
      paid: { cSOL: 0, USDC: 0 },
      stuck: { cSOL: false, USDC: true },
    });
  });

  it("retries unpaid USDC once the treasury can cover the whole remaining leg", () => {
    expect(
      evaluateRedeemAction("liquidating", { ...SOLACE, treasuryUsdcAvailable: 80 }, { kind: "claim_legs" }),
    ).toEqual({
      ok: true,
      amount: 0,
      csolOwed: 0,
      usdcOwed: 0,
      paid: { cSOL: 0, USDC: 80 },
      stuck: { cSOL: false, USDC: false },
    });
  });
});
