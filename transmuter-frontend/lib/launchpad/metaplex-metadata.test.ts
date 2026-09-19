import { describe, expect, it } from "vitest";
import { buildMetaplexMetadata } from "./metaplex-metadata";

describe("buildMetaplexMetadata", () => {
  it("builds off-chain Token Metadata JSON with name, symbol, description, image uri, and socials", () => {
    const metadata = buildMetaplexMetadata({
      name: "Aero Protocol",
      symbol: "AERO",
      description: "Treasury-backed reinforced token",
      image: "https://cdn.example/logo.png",
      externalUrl: "https://aero.example",
      twitter: "@aero",
      telegram: "https://t.me/aero",
      discord: "https://discord.gg/aero",
    });

    expect(metadata).toEqual({
      name: "Aero Protocol",
      symbol: "AERO",
      description: "Treasury-backed reinforced token",
      image: "https://cdn.example/logo.png",
      external_url: "https://aero.example",
      properties: {
        category: "fungible",
        files: [{ uri: "https://cdn.example/logo.png", type: "image/png" }],
      },
      extensions: {
        twitter: "@aero",
        telegram: "https://t.me/aero",
        discord: "https://discord.gg/aero",
      },
    });
  });

  it("omits empty socials and files when no image is uploaded", () => {
    const metadata = buildMetaplexMetadata({
      name: "Bare",
      symbol: "BARE",
      description: "",
      image: null,
      externalUrl: "",
      twitter: "",
      telegram: "",
      discord: "",
    });

    expect(metadata.image).toBeUndefined();
    expect(metadata.external_url).toBeUndefined();
    expect(metadata.properties.files).toEqual([]);
    expect(metadata.extensions).toEqual({});
  });
});
