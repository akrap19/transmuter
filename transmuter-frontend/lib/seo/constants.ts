import { externalLinks, teamEmail } from "@/lib/routes";

/** Canonical production host (SEO pack). Override for previews via env if needed. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.transmuter.net";

export const siteName = "Transmuter";

/** X profile used in cards and Organization `sameAs`. */
export const twitterSite = "@TransmuterTMI";

export const themeColor = "#06060a";

/** Served by `app/opengraph-image.tsx`; `/og-image.png` rewrites here for the SEO pack URL. */
export const defaultOgImagePath = "/opengraph-image";

export const organizationDescription =
  "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and end of life rules defined before trading.";

export function absoluteUrl(path: string): string {
  if (path === "/") return `${siteUrl}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalized.endsWith("/") ? normalized : `${normalized}/`}`;
}

export function assetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

export const organizationId = `${siteUrl}/#organization`;
export const websiteId = `${siteUrl}/#website`;

/** Public copy revision. Sitemap `lastmod` and the docs date use this. */
export const contentUpdatedIso = "2026-11-06";
export const contentUpdatedLabel = "6 November 2026";
export const contentLastModified = new Date(`${contentUpdatedIso}T00:00:00.000Z`);

export function organizationNode() {
  return {
    "@type": "Organization" as const,
    "@id": organizationId,
    name: siteName,
    alternateName: "The Midas Initiative",
    url: `${siteUrl}/`,
    logo: assetUrl("/logo.png"),
    email: teamEmail,
    description: organizationDescription,
    sameAs: [externalLinks.twitter],
  };
}

/** Public URLs in the sitemap. App routes (/coins, /my-coins, /portfolio) stay out. */
export const indexableStaticPaths = [
  "/",
  "/faq",
  "/glossary",
  "/docs",
  "/holders",
  "/integrate",
  "/launchpad",
  "/access",
  "/contact",
] as const;
