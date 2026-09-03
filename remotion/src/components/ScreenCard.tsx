import React from "react";
import { Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C } from "../theme";

interface Props {
  src: string;
  /** entrance delay in frames */
  delay?: number;
  /** slow pan/zoom */
  zoomFrom?: number;
  zoomTo?: number;
  panY?: [number, number];
  width?: number;
  rotate?: number;
  /** height / width of the source capture */
  ratio?: number;
  style?: React.CSSProperties;
  duration: number;
}

/** A macOS-ish window frame holding a real captured product screen. */
export const ScreenCard: React.FC<Props> = ({
  src,
  delay = 0,
  zoomFrom = 1.02,
  zoomTo = 1.09,
  panY = [0, -40],
  width = 1180,
  rotate = 0,
  ratio = 900 / 1440,
  style,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const enterY = interpolate(s, [0, 1], [46, 0]);
  const scale = interpolate(frame - delay, [0, duration], [zoomFrom, zoomTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame - delay, [0, duration], panY, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${C.line}`,
        background: C.bgAlt,
        boxShadow: "0 60px 140px rgba(2,4,12,0.7), 0 0 0 1px rgba(124,92,255,0.14)",
        opacity: s,
        transform: `translateY(${enterY}px) rotate(${rotate}deg)`,
        ...style,
      }}
    >
      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 14,
          background: "rgba(11,16,34,0.95)",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c, opacity: 0.85 }} />
        ))}
      </div>
      <div style={{ height: Math.round(width * ratio), overflow: "hidden" }}>
        <Img
          src={staticFile(`images/${src}`)}
          style={{
            width: "100%",
            display: "block",
            transform: `scale(${scale}) translateY(${y}px)`,
            transformOrigin: "50% 12%",
          }}
        />
      </div>
    </div>
  );
};
