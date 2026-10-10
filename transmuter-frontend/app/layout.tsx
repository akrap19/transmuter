import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import Script from "next/script";
import { BrandMotion } from "@/components/brand/brand-motion";
import { SiteFooter } from "@/components/brand/site-footer";
import { SiteHeader } from "@/components/brand/site-header";
import { AppToaster } from "@/components/system/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SolanaProvider } from "@/components/solana/solana-provider";
import { assetUrl, defaultOgImagePath, siteName, siteUrl, themeColor, twitterSite } from "@/lib/seo/constants";
import { siteAllowsIndexing } from "@/lib/seo/indexing";
import "./globals.css";

const googleTagId = "G-BMKMCMG0SL";

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

export const viewport: Viewport = {
  themeColor,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Transmuter: Value recovery infrastructure for tokens",
    template: "%s · Transmuter",
  },
  description:
    "Launch a Solana token with an isolated treasury, contract-owned liquidity and end of life rules fixed before trading, so buyers can check the contract.",
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
    site: twitterSite,
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
      <head>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`} strategy="beforeInteractive" />
        <Script id="google-tag" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleTagId}');`}
        </Script>
      </head>
      <body className={`${inter.variable} ${manrope.variable}`}>
        <TooltipProvider>
          <BrandMotion />
          <SolanaProvider>
            <AppToaster />
            <SiteHeader />
            {children}
            <SiteFooter />
          </SolanaProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
