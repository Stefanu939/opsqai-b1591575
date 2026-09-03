import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, display, body } from "../theme";

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const line = spring({ frame: frame - 14, fps, config: { damping: 200 } });
  const sub = spring({ frame: frame - 28, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 170 }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: 12,
          color: C.blue,
          opacity: mark,
          transform: `translateY(${interpolate(mark, [0, 1], [20, 0])}px)`,
        }}
      >
        O P S Q A I
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 128,
          lineHeight: 0.98,
          letterSpacing: -4,
          color: C.cream,
          marginTop: 22,
          opacity: line,
          transform: `translateY(${interpolate(line, [0, 1], [46, 0])}px) scale(${interpolate(line, [0, 1], [0.96, 1])})`,
        }}
      >
        Licensing an
        <br />
        operational AI
        <br />
        <span
          style={{
            background: `linear-gradient(92deg, ${C.violet}, ${C.blue} 55%, ${C.aqua})`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          platform
        </span>
      </div>
      <div
        style={{
          marginTop: 30,
          fontFamily: body,
          fontSize: 27,
          color: C.muted,
          opacity: sub,
          transform: `translateY(${interpolate(sub, [0, 1], [18, 0])}px)`,
        }}
      >
        Management Center · Customer Portal · Windows Self-Hosted
      </div>
      <div
        style={{
          marginTop: 44,
          width: interpolate(frame, [30, 110], [0, 560], { extrapolateRight: "clamp" }),
          height: 3,
          borderRadius: 9,
          background: `linear-gradient(90deg, ${C.violet}, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
