import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, display, body } from "../theme";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 16, stiffness: 100 } });
  const b = spring({ frame: frame - 18, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26 }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: 12,
          color: C.blue,
          opacity: a,
        }}
      >
        O P S Q A I
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 96,
          letterSpacing: -3,
          color: C.cream,
          opacity: a,
          transform: `scale(${interpolate(a, [0, 1], [0.94, 1])})`,
        }}
      >
        Operational AI,{" "}
        <span
          style={{
            background: `linear-gradient(92deg, ${C.violet}, ${C.aqua})`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          under control
        </span>
      </div>
      <div style={{ fontFamily: body, fontSize: 27, color: C.muted, opacity: b }}>
        opsqai.de
      </div>
      <div
        style={{
          marginTop: 18,
          width: interpolate(frame, [20, 120], [0, 460], { extrapolateRight: "clamp" }),
          height: 3,
          borderRadius: 9,
          background: `linear-gradient(90deg, transparent, ${C.violet}, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
