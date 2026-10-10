import type { Metadata } from "next";
import { assetUrl, defaultOgImagePath, siteName, siteUrl, twitterSite } from "@/lib/seo/constants";
import { siteAllowsIndexing } from "@/lib/seo/indexing";

type MarketingPageMetadataInput = {
  /** Path without host, e.g. `/faq` */
  path: string;
  title: string;
  description: string;
  /** When set, bypasses the root layout title template */
  absoluteTitle?: boolean;
  /** Wallet pages and filtered Explore URLs stay out of the index. */
  index?: boolean;
  /** Absolute image URL. Falls back to the site card. */
  image?: string;
};

export function marketingPageMetadata(input: MarketingPageMetadataInput): Metadata {
  const canonicalPath = input.path === "/" ? "/" : input.path.replace(/\/$/, "");
  const canonical = canonicalPath === "/" ? `${siteUrl}/` : `${siteUrl}${canonicalPath}/`;

  const title = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;
  const image = input.image ?? assetUrl(defaultOgImagePath);
  const robots = pageRobots(input.index !== false);

  return {
    title,
    description: input.description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical },
    ...(robots ? { robots } : {}),
    icons: {
      icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }, { url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_US",
      title: input.title,
      description: input.description,
      url: canonical,
      images: input.image ? [{ url: image }] : [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      site: twitterSite,
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

function pageRobots(index: boolean): Metadata["robots"] {
  if (!siteAllowsIndexing()) return { index: false, follow: false };
  if (!index) return { index: false, follow: true };
  return undefined;
}
