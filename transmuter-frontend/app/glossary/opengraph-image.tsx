import { marketingOgImage, ogSize } from "@/lib/seo/og-card";

export const runtime = "edge";
export const alt = "Transmuter glossary: EOL token, cToken, escrow, end of life";
export const size = ogSize;
export const contentType = "image/png";

export default function GlossaryOpenGraphImage() {
  return marketingOgImage({
    kicker: "Glossary",
    title: "One noun per object.",
    body: "EOL token, cToken, escrow, treasury, redemption ratio and cGold.",
  });
}
