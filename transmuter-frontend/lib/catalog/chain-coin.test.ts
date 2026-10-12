import { describe, expect, it } from "vitest";
import { basketFromChainLegs, detailFromChainLaunch, parseChainMetadata } from "./chain-coin";

const MINT = "MintHelix111111111111111111111111111111111";
const CSOL = "CsolMint11111111111111111111111111111111111";

describe("basketFromChainLegs", () => {
  it("keeps all four decoded legs in canonical order", () => {
    const legs = [
      { assetKind: 0, weightBps: 6000 },
      { assetKind: 1, weightBps: 0 },
      { assetKind: 2, weightBps: 4000 },
      { assetKind: 3, weightBps: 0 },
    ];
    expect(basketFromChainLegs(legs)).toEqual(legs);
  });

  it("returns null when the basket is missing or malformed", () => {
    expect(basketFromChainLegs(undefined)).toBeNull();
    expect(basketFromChainLegs([])).toBeNull();
    expect(basketFromChainLegs([{ assetKind: 0 }])).toBeNull();
  });
});

describe("detailFromChainLaunch", () => {
  it("carries the launch account basket into the coin page", () => {
    const legs = [
      { assetKind: 0, weightBps: 6000 },
      { assetKind: 1, weightBps: 0 },
      { assetKind: 2, weightBps: 4000 },
      { assetKind: 3, weightBps: 0 },
    ];
    const detail = detailFromChainLaunch(
      {
        mint: MINT,
        name: "Basket test",
        symbol: "BSKT",
        creator: "Creator11111111111111111111111111111111111",
        backingMint: CSOL,
        status: 1,
        launchedAt: 1_791_456_542,
        metadataUri: "",
        backingBasket: legs,
      },
      parseChainMetadata(null),
      { [CSOL]: "cSOL" },
    );

    expect(detail?.backingBasket).toEqual(legs);
  });

  it("builds a coin page from the factory account and metadata json", () => {
    const detail = detailFromChainLaunch(
      {
        mint: MINT,
        name: "Bucket test",
        symbol: "BCKT",
        creator: "Creator11111111111111111111111111111111111",
        backingMint: CSOL,
        status: 2,
        launchedAt: 1_791_456_542,
        metadataUri: "https://media.example/bckt.json",
      },
      parseChainMetadata({
        image: "https://media.example/bckt.png",
        description: "A bucket",
        external_url: "https://bucket.example",
        extensions: { twitter: "https://x.com/bucket" },
      }),
      { [CSOL]: "cSOL" },
    );

    expect(detail?.name).toBe("Bucket test");
    expect(detail?.symbol).toBe("BCKT");
    expect(detail?.status).toBe("sale");
    expect(detail?.backing).toBe("cSOL");
    expect(detail?.logoUrl).toBe("https://media.example/bckt.png");
    expect(detail?.description).toBe("A bucket");
    expect(detail?.socials.website).toBe("https://bucket.example");
    expect(detail?.socials.twitter).toBe("https://x.com/bucket");
    expect(detail?.sale).toBeNull();
  });

  it("returns null when the account is not a factory launch", () => {
    expect(
      detailFromChainLaunch(
        {
          mint: MINT,
          name: "",
          symbol: "BCKT",
          creator: "Creator11111111111111111111111111111111111",
          backingMint: CSOL,
          status: 9,
          launchedAt: 0,
          metadataUri: "",
        },
        parseChainMetadata(null),
      ),
    ).toBeNull();
  });
});
