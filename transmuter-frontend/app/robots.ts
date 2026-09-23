import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/constants";

export default function robots(): MetadataRoute.Robots {
  const allowIndex = process.env.SITE_ALLOW_INDEXING !== "false";

  if (!allowIndex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
