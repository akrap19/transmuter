import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  BACKING_ASSETS,
  DEFAULT_BACKING_BASKET,
  GOLD_FEE_ADDRESS,
  SPX_FEE_ADDRESS,
  activeLegs,
  allocatedReserveFee,
  basketIsComplete,
  basketTotal,
  fallbackBackingAsset,
  primaryBackingAsset,
  setBasketWeight,
  type BackingLeg,
} from "./backing-basket";

const FACTORY = new PublicKey("5D3y69mm4wrz7VcGsagfvnrMorvLar7ZnZaLfd3uVcfV");

function weights(basket: BackingLeg[]): Record<string, number> {
  return Object.fromEntries(basket.map((leg) => [leg.asset, leg.weight]));
}

describe("backing basket", () => {
  it("ships four assets (SOL, BTC, Gold, S&P) with distinct on-chain kinds", () => {
    expect(BACKING_ASSETS.map((m) => m.asset)).toEqual(["SOL", "BTC", "GOLD", "SPX"]);
    expect(BACKING_ASSETS.map((m) => m.kind)).toEqual([0, 1, 2, 3]);
    expect(BACKING_ASSETS.filter((m) => m.settlement === "allocation").map((m) => m.asset)).toEqual([
      "GOLD",
      "SPX",
    ]);
  });

  it("sends Gold and S&P fee shares to one fixed address each", () => {
    const gold = PublicKey.findProgramAddressSync(
      [Buffer.from("backing_fee"), Buffer.from("gold")],
      FACTORY,
    )[0];
    const spx = PublicKey.findProgramAddressSync(
      [Buffer.from("backing_fee"), Buffer.from("spx")],
      FACTORY,
    )[0];
    expect(gold.toBase58()).toBe(GOLD_FEE_ADDRESS);
    expect(spx.toBase58()).toBe(SPX_FEE_ADDRESS);
    expect(allocatedReserveFee(30, 0.1)).toBe(0.03);
    expect(allocatedReserveFee(0, 0.1)).toBe(0);
  });

  it("defaults to a single-asset SOL basket that totals 100%", () => {
    expect(basketTotal(DEFAULT_BACKING_BASKET)).toBe(100);
    expect(weights(DEFAULT_BACKING_BASKET)).toEqual({ SOL: 100, BTC: 0, GOLD: 0, SPX: 0 });
  });

  it("changes only the leg you move and leaves the others alone", () => {
    const next = setBasketWeight(DEFAULT_BACKING_BASKET, "BTC", 40);
    expect(weights(next)).toEqual({ SOL: 100, BTC: 40, GOLD: 0, SPX: 0 });
    expect(basketTotal(next)).toBe(140);
    expect(basketIsComplete(next)).toBe(false);
    expect(basketIsComplete(DEFAULT_BACKING_BASKET)).toBe(true);
  });

  it("clamps weights into 0–100", () => {
    expect(setBasketWeight(DEFAULT_BACKING_BASKET, "BTC", 250).find((l) => l.asset === "BTC")?.weight).toBe(100);
    expect(setBasketWeight(DEFAULT_BACKING_BASKET, "BTC", -5).find((l) => l.asset === "BTC")?.weight).toBe(0);
  });

  it("reports only the funded legs as active", () => {
    const basket: BackingLeg[] = [
      { asset: "SOL", weight: 70 },
      { asset: "BTC", weight: 10 },
      { asset: "GOLD", weight: 10 },
      { asset: "SPX", weight: 10 },
    ];
    expect(activeLegs(basket).length).toBe(4);
    expect(activeLegs(DEFAULT_BACKING_BASKET).map((l) => l.asset)).toEqual(["SOL"]);
  });

  it("derives the primary / fallback cToken from the heavier live-cToken leg", () => {
    expect(primaryBackingAsset(DEFAULT_BACKING_BASKET)).toBe("SOL");
    expect(fallbackBackingAsset(DEFAULT_BACKING_BASKET)).toBe("BTC");

    const btcHeavy: BackingLeg[] = [
      { asset: "SOL", weight: 10 },
      { asset: "BTC", weight: 60 },
      { asset: "GOLD", weight: 30 },
      { asset: "SPX", weight: 0 },
    ];
    expect(primaryBackingAsset(btcHeavy)).toBe("BTC");
    expect(fallbackBackingAsset(btcHeavy)).toBe("SOL");

    // Pure Gold/S&P basket still needs a valid cToken for the Factory plumbing.
    const metals: BackingLeg[] = [
      { asset: "SOL", weight: 0 },
      { asset: "BTC", weight: 0 },
      { asset: "GOLD", weight: 50 },
      { asset: "SPX", weight: 50 },
    ];
    expect(primaryBackingAsset(metals)).toBe("SOL");
    expect(fallbackBackingAsset(metals)).toBe("BTC");
  });
});
