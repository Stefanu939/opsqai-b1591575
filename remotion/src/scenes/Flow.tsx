import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, display, body } from "../theme";

const STEPS = [
  "Management Center decides",
  "Company profile",
  "Enabled products",
  "Signed license",
  "Self-Hosted renders",
];

export const Flow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 54 }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 66,
          letterSpacing: -1.6,
          color: C.cream,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [26, 0])}px)`,
        }}
      >
        One control plane. One signed entitlement.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {STEPS.map((s, i) => {
          const sp = spring({ frame: frame - 20 - i * 12, fps, config: { damping: 16, stiffness: 120 } });
          return (
            <React.Fragment key={s}>
              <div
                style={{
                  fontFamily: body,
                  fontSize: 20,
                  color: C.cream,
                  padding: "18px 22px",
                  borderRadius: 14,
                  border: `1px solid ${C.line}`,
                  background: "rgba(11,16,34,0.72)",
                  boxShadow: `0 0 ${interpolate(sp, [0, 1], [0, 34])}px rgba(124,92,255,0.25)`,
                  opacity: sp,
                  transform: `translateY(${interpolate(sp, [0, 1], [26, 0])}px) scale(${interpolate(sp, [0, 1], [0.9, 1])})`,
                  maxWidth: 210,
                  textAlign: "center",
                }}
              >
                {s}
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  style={{
                    width: interpolate(frame - 26 - i * 12, [0, 14], [0, 34], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                    height: 2,
                    background: `linear-gradient(90deg, ${C.violet}, ${C.blue})`,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: body,
          fontSize: 24,
          color: C.muted,
          opacity: spring({ frame: frame - 90, fps, config: { damping: 200 } }),
        }}
      >
        Ed25519-signed licenses · products activated only where they were granted
      </div>
    </AbsoluteFill>
  );
};
