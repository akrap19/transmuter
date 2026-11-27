import { marketingOgImage, ogSize } from "@/lib/seo/og-card";

export const runtime = "edge";
export const alt = "Transmuter glossary: EOL token, reserve assets, treasury, pools and escrow";
export const size = ogSize;
export const contentType = "image/png";

export default function GlossaryOpenGraphImage() {
  return marketingOgImage({
    kicker: "Glossary",
    title: "One noun per object.",
    body: "EOL token, reserve assets, treasury, pools, redemption value and escrow.",
  });
}
