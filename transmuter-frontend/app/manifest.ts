import type { MetadataRoute } from "next";
import { organizationDescription, siteName, themeColor } from "@/lib/seo/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName}: Value recovery infrastructure for tokens`,
    short_name: siteName,
    description: organizationDescription,
    start_url: "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    lang: "en",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
