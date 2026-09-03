import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, display, body } from "../theme";

export const Kicker: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        fontFamily: body,
        fontSize: 20,
        letterSpacing: 5,
        textTransform: "uppercase",
        color: C.blue,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-24, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Headline: React.FC<{ children: React.ReactNode; delay?: number; size?: number }> = ({
  children,
  delay = 0,
  size = 74,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 90 } });
  return (
    <div
      style={{
        fontFamily: display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.02,
        color: C.cream,
        letterSpacing: -1.5,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [34, 0])}px)`,
        filter: `blur(${interpolate(s, [0, 1], [10, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; delay?: number; width?: number }> = ({
  children,
  delay = 0,
  width = 620,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        fontFamily: body,
        fontSize: 26,
        lineHeight: 1.5,
        color: C.muted,
        maxWidth: width,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Bullets: React.FC<{ items: string[]; delay?: number }> = ({ items, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((t, i) => {
        const s = spring({ frame: frame - delay - i * 9, fps, config: { damping: 200 } });
        return (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: body,
              fontSize: 24,
              color: C.cream,
              opacity: s,
              transform: `translateX(${interpolate(s, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: i % 2 === 0 ? C.violet : C.aqua,
                boxShadow: `0 0 18px ${i % 2 === 0 ? C.violet : C.aqua}`,
              }}
            />
            {t}
          </div>
        );
      })}
    </div>
  );
};
