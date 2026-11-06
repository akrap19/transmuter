import type { MetadataRoute } from "next";
import { absoluteUrl, contentLastModified, indexableStaticPaths } from "@/lib/seo/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableStaticPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: contentLastModified,
  }));
}
