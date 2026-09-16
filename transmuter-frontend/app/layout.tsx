import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron } from "next/font/google";
import { GridBackground } from "@/components/transmuter/grid-background";
import { SolanaProvider } from "@/components/solana/solana-provider";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Transmuter · Launchpad & End of Life Infrastructure",
    template: "%s · Transmuter",
  },
  description:
    "Every token has an end of life. Transmuter is the launchpad and infrastructure that ensures holders never lose everything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${jetbrainsMono.variable}`}>
        <GridBackground />
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}
