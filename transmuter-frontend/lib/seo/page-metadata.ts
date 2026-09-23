import type { Metadata } from "next";
import { assetUrl, defaultOgImagePath, siteName, siteUrl, themeColor } from "@/lib/seo/constants";
import { siteAllowsIndexing } from "@/lib/seo/indexing";

type MarketingPageMetadataInput = {
  /** Path without host, e.g. `/faq` */
  path: string;
  title: string;
  description: string;
  /** When set, bypasses the root layout title template */
  absoluteTitle?: boolean;
};

export function marketingPageMetadata(input: MarketingPageMetadataInput): Metadata {
  const canonicalPath = input.path === "/" ? "/" : input.path.replace(/\/$/, "");
  const canonical = canonicalPath === "/" ? `${siteUrl}/` : `${siteUrl}${canonicalPath}/`;

  const title = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

  return {
    title,
    description: input.description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical },
    themeColor,
    ...(siteAllowsIndexing() ? {} : { robots: { index: false, follow: false } }),
    icons: {
      icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }, { url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      siteName,
      title: input.title,
      description: input.description,
      url: canonical,
      images: [
        {
          url: assetUrl(defaultOgImagePath),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [assetUrl(defaultOgImagePath)],
    },
  };
}
