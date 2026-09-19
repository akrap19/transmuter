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

const nextConfig: NextConfig = {
  transpilePackages: [
    "@coral-xyz/anchor",
    "@solana/spl-token",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
  ],
  async redirects() {
    return [
      { source: legacyRoutes.home, destination: routes.home, permanent: true },
      { source: legacyRoutes.homeAlt, destination: routes.home, permanent: true },
      { source: legacyRoutes.launchpad, destination: routes.launchpad, permanent: true },
      { source: legacyRoutes.docs, destination: routes.docs, permanent: true },
      { source: legacyRoutes.access, destination: routes.access, permanent: true },
      { source: legacyRoutes.contact, destination: routes.contact, permanent: true },
    ];
  },
};

export default nextConfig;
