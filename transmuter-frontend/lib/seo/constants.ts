import { teamEmail } from "@/lib/routes";

/** Canonical production host (SEO pack). Override for previews via env if needed. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.transmuter.net";

export const siteName = "Transmuter";

export const themeColor = "#06060a";

/** Served by `app/opengraph-image.tsx`; `/og-image.png` rewrites here for the SEO pack URL. */
export const defaultOgImagePath = "/opengraph-image";

export const organizationDescription =
  "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading.";

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
  };
}

export const marketingSitemapPaths = [
  "/",
  "/faq",
  "/glossary",
  "/integrate",
  "/holders",
  "/access",
] as const;
