import { describe, expect, it } from "vitest";
import { postSaleButtonOrder, postSaleOffers, raydiumSeedAmounts } from "./post-sale";

const NOW = 1_700_000_000;

describe("postSaleOffers", () => {
  it("offers finalize to any cranker once the window ends or the allocation sells out", () => {
    expect(postSaleOffers(sale({ now: NOW, saleEnd: NOW }))).toEqual(["finalize"]);
    expect(postSaleOffers(sale({ now: NOW - 1, saleEnd: NOW, soldTokens: BigInt(40), saleTokens: BigInt(40) }))).toEqual(["finalize"]);
    expect(postSaleOffers(sale({ now: NOW - 1, saleEnd: NOW, soldTokens: BigInt(10), saleTokens: BigInt(40) }))).toEqual([]);
    expect(
      postSaleOffers(
        sale({
          now: NOW - 1,
          saleEnd: NOW,
          soldTokens: BigInt(13_299_998_137),
          saleTokens: BigInt(13_300_000_000),
          salePrice: BigInt(375_939),
          decimals: 9,
        }),
      ),
    ).toEqual(["finalize"]);
    expect(postSaleOffers(sale({ status: "active", now: NOW, saleEnd: NOW }))).not.toContain("finalize");
  });

  it("shows claim before treasury conversion", () => {
    expect(postSaleButtonOrder(["convertTreasury", "claimTokens"])).toEqual(["claimTokens", "convertTreasury"]);
    expect(postSaleButtonOrder(["claimTokens"])).toEqual(["claimTokens"]);
    expect(postSaleButtonOrder(["convertTreasury"])).toEqual(["convertTreasury"]);
  });

  it("offers treasury conversion, Raydium LP seed, and a participant claim after the sale is active", () => {
    expect(
      postSaleOffers(
        sale({
          status: "active",
          convertDone: false,
          claimed: false,
          depositAtoms: BigInt(4_000_000),
          lpTokenAtoms: BigInt(1_000),
          saleUsdcAtoms: BigInt(500),
          wsolAtoms: BigInt(200),
          lpUsdcShareBps: 5_000,
        }),
      ),
    ).toEqual(["convertTreasury", "seedRaydiumUsdc", "seedRaydiumWsol", "claimTokens"]);
  });

  it("hides conversion after it is done, seed legs with an empty side, and a claim that was already taken", () => {
    expect(
      postSaleOffers(
        sale({
          status: "active",
          convertDone: true,
          claimed: true,
          depositAtoms: BigInt(4_000_000),
          lpTokenAtoms: BigInt(1_000),
          saleUsdcAtoms: BigInt(0),
          wsolAtoms: BigInt(0),
          lpUsdcShareBps: 5_000,
        }),
      ),
    ).toEqual([]);
    expect(raydiumSeedAmounts({ lpTokenAtoms: BigInt(1_000), saleUsdcAtoms: BigInt(9), wsolAtoms: BigInt(4), lpUsdcShareBps: 2_500 })).toEqual({
      usdc: { token: BigInt(250), quote: BigInt(9) },
      wsol: { token: BigInt(750), quote: BigInt(4) },
    });
  });
});

function sale(overrides: Partial<Parameters<typeof postSaleOffers>[0]>) {
  return {
    status: "sale" as const,
    now: NOW,
    saleEnd: NOW + 60,
    soldTokens: BigInt(0),
    saleTokens: BigInt(100),
    convertDone: true,
    claimed: false,
    depositAtoms: BigInt(0),
    lpTokenAtoms: BigInt(0),
    saleUsdcAtoms: BigInt(0),
    wsolAtoms: BigInt(0),
    lpUsdcShareBps: 0,
    salePrice: BigInt(1_000_000),
    decimals: 6,
    ...overrides,
  };
}
