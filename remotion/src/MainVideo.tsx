import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Aurora } from "./components/Aurora";
import { Title } from "./scenes/Title";
import { Showcase } from "./scenes/Showcase";
import { Flow } from "./scenes/Flow";
import { Outro } from "./scenes/Outro";

const T = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: T });

export const MainVideo: React.FC = () => (
  <AbsoluteFill>
    <Aurora />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={130}>
        <Title />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={320}>
        <Showcase
          kicker="Management Center"
          headline={<>Configure the customer</>}
          items={[
            "Company profile defines what is available",
            "Products enabled explicitly by OPSQAI",
            "Initial administrator and seat count",
          ]}
          shots={[
            { src: "mc-customers.png", from: 0, duration: 165 },
            { src: "mc-new-customer.png", from: 165, duration: 155 },
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={290}>
        <Showcase
          align="right"
          kicker="Licensing"
          headline={<>Issue the signed license</>}
          items={[
            "Entitlements per customer install",
            "Ed25519 / JWT activation bundle",
            "Reissue when products change",
          ]}
          shots={[{ src: "mc-licenses.png", from: 0, duration: 290 }]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={360}>
        <Showcase
          kicker="Windows Self-Hosted"
          headline={<>Install inside the customer estate</>}
          items={[
            "Guided nine-step Windows installer",
            "License validated locally, offline",
            "Bundled database and local AI engine",
          ]}
          shots={[
            { src: "inst-welcome.png", from: 0, duration: 110 },
            { src: "inst-license.png", from: 110, duration: 130 },
            { src: "inst-system.png", from: 240, duration: 120 },
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={230}>
        <Showcase
          align="right"
          kicker="Fleet visibility"
          headline={<>Every install reports back</>}
          items={["Signed heartbeat from each install", "Version, health and seat usage", "No customer data leaves the estate"]}
          shots={[{ src: "mc-installations.png", from: 0, duration: 230 }]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={230}>
        <Showcase
          kicker="Customer Portal"
          headline={<>The customer sees the truth</>}
          items={["License and install status", "Core capabilities and active products", "Downloads and support in EN · DE · RO"]}
          shots={[{ src: "portal.png", from: 0, duration: 230 }]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={200}>
        <Flow />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={170}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
