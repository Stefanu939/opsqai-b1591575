import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, body } from "../theme";

/**
 * Burned-in caption bar. Static text for the whole shot (social feeds play
 * muted, so the narration must also be readable).
 */
export const Subtitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 6, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 54,
        display: "flex",
        justifyContent: "center",
        opacity: s,
      }}
    >
      <div
        style={{
          maxWidth: 1420,
          padding: "16px 30px",
          borderRadius: 16,
          background: "rgba(6,9,20,0.74)",
          border: `1px solid ${C.line}`,
          fontFamily: body,
          fontSize: 30,
          lineHeight: 1.35,
          textAlign: "center",
          color: C.cream,
        }}
      >
        {children}
      </div>
    </div>
  );
};
