import { describe, expect, it, vi } from "vitest";
import { serializeJsonLd } from "@/components/seo/json-ld-script";
import { organizationNode, siteUrl } from "@/lib/seo/constants";
import { coinShareDescription, coinShareMetadata, shareImageUrl, unlistedCoinMetadata } from "@/lib/seo/coin-metadata";
import { listSitemapCoins } from "@/lib/seo/coin-sitemap";
import { homePageGraph } from "@/lib/seo/json-ld";
import { siteAllowsIndexing } from "@/lib/seo/indexing";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { metaDescription } from "@/lib/seo/text";

const HELIX = {
  mint: "MintHelix111111111111111111111111111111111",
  name: "Helix",
  symbol: "HLX",
  creator: "Creator11111111111111111111111111111111111",
  backing: "cSOL",
  status: "active" as const,
  priceUsd: 2.15,
  marketCapUsd: 860_000,
  backingRatioBps: 2140,
  saleProgressBps: 0,
  holderCount: 12,
  launchedAt: 1_700_000_000,
  logoUrl: null,
  metadataUri: null,
};

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("search metadata", () => {
  it("canonicalizes public pages on the production host with a trailing slash", () => {
    const metadata = marketingPageMetadata({
      path: "/docs",
      title: "How Transmuter works",
      description: "Docs",
    });

    expect(metadata.alternates).toEqual({ canonical: `${siteUrl}/docs/` });
    expect(metadata.robots).toEqual(siteAllowsIndexing() ? undefined : { index: false, follow: false });
    expect(metadata.twitter).toMatchObject({ site: "@TransmuterTMI" });
  });

  it("keeps wallet pages and filtered views out of the index", () => {
    const metadata = marketingPageMetadata({
      path: "/portfolio",
      title: "Portfolio",
      description: "Wallet",
      index: false,
    });

    expect(metadata.robots).toEqual(
      siteAllowsIndexing() ? { index: false, follow: true } : { index: false, follow: false },
    );
  });

  it("uses a coin description when one exists, and a short fallback otherwise", () => {
    expect(coinShareDescription({ name: "Helix", symbol: "HLX", description: "Treasury notes." })).toBe(
      "Treasury notes.",
    );
    expect(coinShareDescription({ name: "Helix", symbol: "HLX", description: "  " })).toContain("Helix (HLX)");
    expect(metaDescription("word ".repeat(80), "fallback").length).toBeLessThanOrEqual(160);
  });

  it("shares https logos and ignores data URLs", () => {
    expect(shareImageUrl("https://cdn.example/helix.png")).toBe("https://cdn.example/helix.png");
    expect(shareImageUrl("data:image/png;base64,abc")).toBeUndefined();
    const metadata = coinShareMetadata({
      ...HELIX,
      description: "Helix treasury",
      logoUrl: "https://cdn.example/helix.png",
    });
    expect(metadata.openGraph).toMatchObject({
      url: `${siteUrl}/coins/${HELIX.mint}/`,
      images: [{ url: "https://cdn.example/helix.png" }],
    });
  });

  it("marks an unknown mint noindex", () => {
    expect(unlistedCoinMetadata(HELIX.mint).robots).toEqual(
      siteAllowsIndexing() ? { index: false, follow: true } : { index: false, follow: false },
    );
  });

  it("names the X profile on the organization and offers Explore as the site search", () => {
    expect(organizationNode().sameAs).toEqual(["https://x.com/TransmuterTMI"]);
    const graph = homePageGraph({ name: "Home", description: "Home" }) as {
      "@graph": { "@type": string; potentialAction?: { target: { urlTemplate: string } } }[];
    };
    const website = graph["@graph"].find((node) => node["@type"] === "WebSite");
    expect(website?.potentialAction?.target.urlTemplate).toBe(`${siteUrl}/coins/?q={search_term_string}`);
  });

  it("escapes script-breaking characters in JSON-LD", () => {
    expect(serializeJsonLd({ name: "</script>" })).toBe('{"name":"\\u003c/script>"}');
  });

  it("pages indexed launches into sitemap entries", async () => {
    const first = { ...HELIX, mint: "MintA", launchedAt: 1_700_000_000 };
    const second = { ...HELIX, mint: "MintB", launchedAt: 100 };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [first], total: 2 }))
      .mockResolvedValueOnce(jsonResponse({ items: [second], total: 2 }));

    const coins = await listSitemapCoins({ fetchFn, env: { NEXT_PUBLIC_API_URL: "http://api.test" } }, 1);

    expect(coins).toEqual([
      { path: "/coins/MintA", lastModified: new Date(1_700_000_000 * 1000) },
      { path: "/coins/MintB" },
    ]);
  });

  it("returns the coins already collected when a later page fails", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [HELIX], total: 2 }))
      .mockResolvedValueOnce(jsonResponse({ error: "down" }, 500));

    const coins = await listSitemapCoins({ fetchFn, env: { NEXT_PUBLIC_API_URL: "http://api.test" } }, 1);

    expect(coins.map((coin) => coin.path)).toEqual([`/coins/${HELIX.mint}`]);
  });
});
