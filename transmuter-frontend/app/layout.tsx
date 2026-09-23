import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { BrandMotion } from "@/components/brand/brand-motion";
import { SiteFooter } from "@/components/brand/site-footer";
import { SiteHeader } from "@/components/brand/site-header";
import { SolanaProvider } from "@/components/solana/solana-provider";
import { assetUrl, defaultOgImagePath, siteName, siteUrl, themeColor } from "@/lib/seo/constants";
import { siteAllowsIndexing } from "@/lib/seo/indexing";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Transmuter: Value recovery infrastructure for tokens",
    template: "%s · Transmuter",
  },
  description:
    "Launch a Solana token with an isolated treasury, contract-owned liquidity and recovery rules fixed before trading, so buyers can check the contract.",
  themeColor,
  ...(siteAllowsIndexing() ? {} : { robots: { index: false, follow: false } }),
  icons: {
    icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName,
    images: [{ url: assetUrl(defaultOgImagePath), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [assetUrl(defaultOgImagePath)],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <BrandMotion />
        <SolanaProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </SolanaProvider>
      </body>
    </html>
  );
}
