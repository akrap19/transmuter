import { describe, expect, it } from "vitest";
import { toChartPoint, toIndexedCoin, toListItem } from "./map.ts";

const row = {
  mint: "MintHelix111111111111111111111111111111111",
  name: "Helix",
  symbol: "HLX",
  creator: "Creator11111111111111111111111111111111111",
  backing: "cSOL",
  status: "active",
  metadataUri: "https://cdn.example/helix.json",
  logoUrl: "https://cdn.example/helix.png",
  description: "Unconverted USDC still counts in backing.",
  website: "https://helix.example",
  twitter: null,
  telegram: null,
  discord: null,
  launchedAt: 1_745_100_000,
  priceUsd: "2.15000000",
  marketCapUsd: "860000.00",
  backingRatioBps: 2140,
  saleProgressBps: null,
  holderCount: 318,
};

describe("launch row mapping", () => {
  it("maps a launches row plus current stats onto the catalog list item", () => {
    expect(toListItem(row)).toEqual({
      mint: "MintHelix111111111111111111111111111111111",
      name: "Helix",
      symbol: "HLX",
      creator: "Creator11111111111111111111111111111111111",
      backing: "cSOL",
      status: "active",
      priceUsd: 2.15,
      marketCapUsd: 860000,
      backingRatioBps: 2140,
      saleProgressBps: null,
      holderCount: 318,
      launchedAt: 1_745_100_000,
      logoUrl: "https://cdn.example/helix.png",
      metadataUri: "https://cdn.example/helix.json",
    });
  });

  it("keeps description and socials on the indexed detail", () => {
    expect(toIndexedCoin(row)).toMatchObject({
      symbol: "HLX",
      description: "Unconverted USDC still counts in backing.",
      socials: {
        website: "https://helix.example",
        twitter: null,
        telegram: null,
        discord: null,
      },
    });
  });

  it("maps price_history rows onto chart points", () => {
    expect(
      toChartPoint({
        t: 1_745_100_000,
        priceUsd: "2.15",
        volumeUsd: "18600.00",
      }),
    ).toEqual({ t: 1_745_100_000, priceUsd: 2.15, volumeUsd: 18600 });
  });
});
