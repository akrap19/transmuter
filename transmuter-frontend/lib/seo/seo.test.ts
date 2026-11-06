import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/components/seo/json-ld-script";
import { glossaryTerms } from "@/lib/marketing/glossary-data";
import { contentUpdatedIso, indexableStaticPaths, organizationNode, siteUrl } from "@/lib/seo/constants";
import { coinShareDescription, coinShareMetadata, shareImageUrl, unlistedCoinMetadata } from "@/lib/seo/coin-metadata";
import { docsPageGraph, glossaryPageGraph, siteGraph } from "@/lib/seo/json-ld";
import { isIndexableHost, siteAllowsIndexing } from "@/lib/seo/indexing";
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
    expect(metadata.robots).toEqual(
      siteAllowsIndexing() ? { index: false, follow: true } : { index: false, follow: false },
    );
  });

  it("marks an unknown mint noindex", () => {
    expect(unlistedCoinMetadata(HELIX.mint).robots).toEqual(
      siteAllowsIndexing() ? { index: false, follow: true } : { index: false, follow: false },
    );
  });

  it("names the X profile on the organization and publishes the site without a coin search box", () => {
    expect(organizationNode().sameAs).toEqual(["https://x.com/TransmuterTMI"]);
    const graph = siteGraph() as {
      "@graph": { "@type": string; "@id"?: string; publisher?: { "@id": string }; potentialAction?: unknown }[];
    };
    const website = graph["@graph"].find((node) => node["@type"] === "WebSite");
    expect(website?.["@id"]).toBe(`${siteUrl}/#website`);
    expect(website?.publisher).toEqual({ "@id": `${siteUrl}/#organization` });
    expect(website?.potentialAction).toBeUndefined();
  });

  it("keeps coin URLs out of the sitemap and dates the static pages", () => {
    expect(indexableStaticPaths).not.toContain("/coins");
    expect(indexableStaticPaths).toEqual([
      "/",
      "/faq",
      "/glossary",
      "/docs",
      "/holders",
      "/integrate",
      "/launchpad",
      "/access",
      "/contact",
    ]);
  });

  it("indexes only the canonical host", () => {
    expect(isIndexableHost("www.transmuter.net")).toBe(true);
    expect(isIndexableHost("WWW.TRANSMUTER.NET:443")).toBe(true);
    expect(isIndexableHost("transmuter.net")).toBe(false);
    expect(isIndexableHost("transmuter-95i8.vercel.app")).toBe(false);
    expect(isIndexableHost(null)).toBe(false);
  });

  it("describes the docs as a TechArticle with the visible revision date", () => {
    const graph = docsPageGraph({
      name: "How Transmuter works",
      description: "Docs",
      headline: "How Transmuter works",
    }) as { "@graph": { "@type": string; headline?: string; dateModified?: string; publisher?: { "@id": string } }[] };
    const article = graph["@graph"].find((node) => node["@type"] === "TechArticle");
    expect(article).toMatchObject({
      headline: "How Transmuter works",
      dateModified: contentUpdatedIso,
      publisher: { "@id": `${siteUrl}/#organization` },
    });
  });

  it("builds glossary schema from the same terms the page renders", () => {
    const graph = glossaryPageGraph({ name: "Glossary", description: "Terms" }, glossaryTerms) as {
      "@graph": { "@type": string; hasDefinedTerm?: { "@id": string; description: string }[] }[];
    };
    const termSet = graph["@graph"].find((node) => node["@type"] === "DefinedTermSet");
    expect(termSet?.hasDefinedTerm?.map((term) => term.description)).toEqual(glossaryTerms.map((term) => term.body));
    expect(termSet?.hasDefinedTerm?.map((term) => term["@id"])).toContain(`${siteUrl}/glossary/#cgold`);
  });

  it("escapes script-breaking characters in JSON-LD", () => {
    expect(serializeJsonLd({ name: "</script>" })).toBe('{"name":"\\u003c/script>"}');
  });
});
