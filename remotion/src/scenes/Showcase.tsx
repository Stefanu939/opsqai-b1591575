import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { ScreenCard } from "../components/ScreenCard";
import { Kicker, Headline, Bullets } from "../components/Caption";

interface Props {
  kicker: string;
  headline: React.ReactNode;
  items: string[];
  shots: { src: string; from: number; duration: number }[];
  align?: "left" | "right";
}

/** Text column on one side, a real captured product screen on the other. */
export const Showcase: React.FC<Props> = ({ kicker, headline, items, shots, align = "left" }) => {
  const textOnLeft = align === "left";

  return (
    <AbsoluteFill>
      {shots.map((s, i) => (
        <Sequence key={s.src} from={s.from} durationInFrames={s.duration}>
          <AbsoluteFill
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: textOnLeft ? "flex-end" : "flex-start",
              padding: "0 50px",
            }}
          >
            <ScreenCard
              src={s.src}
              duration={s.duration}
              width={s.src.startsWith("inst-") ? 880 : 960}
              ratio={s.src.startsWith("inst-") ? 760 / 1100 : 900 / 1440}
              rotate={i % 2 === 0 ? -0.7 : 0.7}
              zoomFrom={1.02 + i * 0.01}
              zoomTo={1.1}
              panY={i % 2 === 0 ? [0, -40] : [-26, 8]}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: textOnLeft ? "flex-start" : "flex-end",
          padding: "0 74px",
        }}
      >
        <div
          style={{
            width: 500,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            textAlign: textOnLeft ? "left" : "right",
            alignItems: textOnLeft ? "flex-start" : "flex-end",
            padding: "34px 30px",
            borderRadius: 22,
            background: "linear-gradient(180deg, rgba(7,10,20,0.90), rgba(7,10,20,0.72))",
            backdropFilter: undefined,
            boxShadow: "0 40px 120px rgba(3,5,12,0.75)",
          }}
        >
          <Kicker delay={4}>{kicker}</Kicker>
          <Headline delay={10} size={50}>
            {headline}
          </Headline>
          <div style={{ marginTop: 4 }}>
            <Bullets items={items} delay={30} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
