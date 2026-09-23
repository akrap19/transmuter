import type { NextConfig } from "next";
import { routes } from "./lib/routes";

const legacyRoutes = {
  home: "/transmuter_home_animated.html",
  homeAlt: "/transmuter_home.html",
  launchpad: "/transmuter_launchpad.html",
  docs: "/transmuter_docs.html",
  access: "/transmuter_access.html",
  contact: "/transmuter_contact.html",
} as const;

const siteAllowsIndexing = process.env.SITE_ALLOW_INDEXING !== "false";

const nextConfig: NextConfig = {
  trailingSlash: true,
  transpilePackages: [
    "@coral-xyz/anchor",
    "@solana/spl-token",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
  ],
  async headers() {
    if (siteAllowsIndexing) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/og-image.png", destination: "/opengraph-image" },
      { source: "/apple-touch-icon.png", destination: "/apple-icon" },
      { source: "/favicon.ico", destination: "/icon" },
    ];
  },
  async redirects() {
    return [
      { source: legacyRoutes.home, destination: routes.home, permanent: true },
      { source: legacyRoutes.homeAlt, destination: routes.home, permanent: true },
      { source: legacyRoutes.launchpad, destination: routes.launchpad, permanent: true },
      { source: legacyRoutes.docs, destination: routes.docs, permanent: true },
      { source: legacyRoutes.access, destination: routes.access, permanent: true },
      { source: legacyRoutes.contact, destination: routes.contact, permanent: true },
      // SEO pack: old marketing paths (native /launchpad and /contact stay on this app)
      { source: "/eol-tokens", destination: routes.glossary, permanent: true },
      { source: "/d-tokens", destination: routes.glossary, permanent: true },
      { source: "/dg", destination: routes.home, permanent: true },
      { source: "/dao", destination: routes.faq, permanent: true },
      { source: "/invest", destination: routes.home, permanent: true },
      { source: "/analytics", destination: routes.home, permanent: true },
    ];
  },
};

export default nextConfig;
