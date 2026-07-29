import { ImageResponse } from "next/og";
import { oneliner } from "@/lib/copy";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "202Lab";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", fontSize: 180, letterSpacing: -6 }}>
          202
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              background: "#c6ff3e",
              marginLeft: 14,
              marginBottom: 30,
            }}
          />
        </div>
        <div style={{ fontSize: 44, lineHeight: 1.2, maxWidth: 900 }}>{oneliner("pt")}</div>
      </div>
    ),
    size,
  );
}
