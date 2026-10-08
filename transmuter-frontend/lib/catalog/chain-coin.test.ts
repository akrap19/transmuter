import { describe, expect, it } from "vitest";
import { detailFromChainLaunch, parseChainMetadata } from "./chain-coin";

const MINT = "MintHelix111111111111111111111111111111111";
const CSOL = "CsolMint11111111111111111111111111111111111";

describe("detailFromChainLaunch", () => {
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
