import { marketingOgImage, ogSize } from "@/lib/seo/og-card";

export const runtime = "edge";
export const alt = "Transmuter FAQ: reserves, escrow, governance and end of life";
export const size = ogSize;
export const contentType = "image/png";

export default function FaqOpenGraphImage() {
  return marketingOgImage({
    kicker: "FAQ",
    title: "Questions, answered directly.",
    body: "Reserves, escrow, governance and end of life.",
  });
}
