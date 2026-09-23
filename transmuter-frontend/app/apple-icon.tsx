import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0c11",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            border: "4px solid #c99a2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "4px solid #f0c24b",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
