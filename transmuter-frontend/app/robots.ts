import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/constants";
import { siteAllowsIndexing } from "@/lib/seo/indexing";

export default function robots(): MetadataRoute.Robots {
  if (!siteAllowsIndexing()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
