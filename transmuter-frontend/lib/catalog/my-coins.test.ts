import { describe, expect, it } from "vitest";
import { createdCoins, heldCoins } from "./my-coins";
import type { CoinListItem } from "./types";

const CREATOR = "Creator11111111111111111111111111111111111";
const OTHER = "Creator22222222222222222222222222222222222";

function coin(partial: Partial<CoinListItem> & Pick<CoinListItem, "mint" | "name" | "status">): CoinListItem {
  return {
    symbol: partial.symbol ?? "TKN",
    creator: CREATOR,
    backing: "cSOL",
    priceUsd: 1,
    marketCapUsd: 100,
    backingRatioBps: 1800,
    saleProgressBps: 0,
    holderCount: 1,
    launchedAt: 1,
    logoUrl: null,
    metadataUri: null,
    ...partial,
  };
}

const catalog: CoinListItem[] = [
  coin({ mint: "MintCreated11111111111111111111111111111", name: "Mine", status: "sale" }),
  coin({ mint: "MintTheirs111111111111111111111111111111", name: "Theirs", status: "active", creator: OTHER }),
  coin({ mint: "MintHeld11111111111111111111111111111111", name: "Held", status: "voided", creator: OTHER }),
];

describe("createdCoins", () => {
  it("returns Factory-registered launches whose creator matches the wallet", () => {
    const mine = createdCoins(catalog, CREATOR);

    expect(mine.map((item) => item.name)).toEqual(["Mine"]);
  });
});

describe("heldCoins", () => {
  it("intersects token accounts with known EOL mints and drops zero balances", () => {
    const held = heldCoins(catalog, [
      { mint: "MintHeld11111111111111111111111111111111", amount: 12.5 },
      { mint: "UnknownMint11111111111111111111111111111", amount: 99 },
      { mint: "MintCreated11111111111111111111111111111", amount: 0 },
    ]);

    expect(held).toEqual([
      expect.objectContaining({ name: "Held", amount: 12.5, status: "voided" }),
    ]);
  });
});
