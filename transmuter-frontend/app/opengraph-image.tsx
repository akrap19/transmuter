import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Transmuter: Value recovery infrastructure for tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #06060a 0%, #101018 55%, #0a0c11 100%)",
          color: "#f5f5f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#c99a2e",
            marginBottom: 24,
          }}
        >
          Transmuter
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Value recovery infrastructure for tokens
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            lineHeight: 1.45,
            color: "rgba(245,245,247,0.82)",
            maxWidth: 880,
          }}
        >
          Isolated treasury, contract-owned liquidity and recovery rules fixed before trading on Solana.
        </div>
      </div>
    ),
    { ...size },
  );
}
