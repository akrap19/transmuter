import { marketingOgImage, ogSize } from "@/lib/seo/og-card";

export const runtime = "edge";
export const alt = "How Transmuter works: reserves, escrow, fees and end of life";
export const size = ogSize;
export const contentType = "image/png";

export default function DocsOpenGraphImage() {
  return marketingOgImage({
    kicker: "Docs",
    title: "How Transmuter works",
    body: "Reserves, escrow, fees and end of life, fixed before trading.",
  });
}
