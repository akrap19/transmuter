import type { MetadataRoute } from "next";
import { absoluteUrl, marketingSitemapPaths } from "@/lib/seo/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return marketingSitemapPaths.map((path) => ({
    url: absoluteUrl(path),
  }));
}
