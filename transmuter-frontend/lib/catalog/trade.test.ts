import { describe, expect, it } from "vitest";
import { SOL_MINT, USDC_MINT, dexSwapUrl, tradeAvailable, tradePools } from "./trade";

describe("trade panels", () => {
  it("offers EOL/USDC and EOL/SOL deep-links only after finalize", () => {
    expect(tradeAvailable("sale")).toBe(false);
    expect(tradeAvailable("voided")).toBe(false);
    expect(tradeAvailable("active")).toBe(true);
    expect(tradeAvailable("liquidating")).toBe(true);

    const mint = "MintHelix111111111111111111111111111111111";
    expect(dexSwapUrl(USDC_MINT, mint)).toBe(`https://jup.ag/swap/${USDC_MINT}-${mint}`);

    expect(tradePools(mint, "UsdcPool11111111111111111111111111111111", "SolPool111111111111111111111111111111111")).toEqual([
      {
        label: "EOL/USDC",
        pool: "UsdcPool11111111111111111111111111111111",
        href: dexSwapUrl(USDC_MINT, mint),
      },
      {
        label: "EOL/SOL",
        pool: "SolPool111111111111111111111111111111111",
        href: dexSwapUrl(SOL_MINT, mint),
      },
    ]);
  });
});
