import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      {/* Handle */}
      <div
        style={{
          position: "absolute",
          bottom: 2,
          left: 13,
          width: 6,
          height: 14,
          borderRadius: 2,
          background: "#92400e",
        }}
      />
      {/* Outer flame */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 8,
          width: 16,
          height: 18,
          borderRadius: "50% 50% 40% 40%",
          background: "#ea580c",
        }}
      />
      {/* Inner flame */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 12,
          width: 8,
          height: 10,
          borderRadius: "50% 50% 40% 40%",
          background: "#fbbf24",
        }}
      />
    </div>,
    { ...size }
  );
}
