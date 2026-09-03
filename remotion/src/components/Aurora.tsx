import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** Persistent Aurora Noir background: drifting violet/blue auras + fine grid. */
export const Aurora: React.FC = () => {
  const f = useCurrentFrame();
  const drift = (speed: number, amp: number, phase = 0) =>
    Math.sin((f / (speed * 3)) + phase) * (amp * 0.35);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 700px at ${50 + drift(90, 8)}% ${18 + drift(120, 6)}%, rgba(124,92,255,0.34), transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(1000px 620px at ${18 + drift(70, 10, 1.2)}% ${82 + drift(100, 6, 2)}%, rgba(58,160,255,0.24), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 520px at ${86 + drift(80, 6, 3)}% ${72 + drift(110, 8, 0.6)}%, rgba(56,225,198,0.14), transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.10,
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 40%, rgba(3,5,12,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
