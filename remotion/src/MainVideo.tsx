import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Aurora } from "./components/Aurora";
import { Subtitle } from "./components/Subtitle";
import { Title } from "./scenes/Title";
import { Showcase } from "./scenes/Showcase";
import { Flow } from "./scenes/Flow";
import { Outro } from "./scenes/Outro";

const T = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: T });

/** Scene durations — kept in sync with scripts/narration.json. */
export const SCENE_FRAMES = [286, 348, 360, 327, 339, 338, 267, 268, 332, 286] as const;
export const TRANSITION_FRAMES = T;
export const TOTAL_FRAMES =
  SCENE_FRAMES.reduce((a, b) => a + b, 0) - T * (SCENE_FRAMES.length - 1);

const CAPTIONS = [
  "OPSQAI is an operational AI platform for companies that need their knowledge, training and compliance to run inside their own environment.",
  "Everything starts in the Management Center: create the customer, select the company profile, and explicitly enable the products.",
  "A signed license is issued — entitlements packed into an Ed25519 activation bundle, reissued whenever the configuration changes.",
  "The Windows Self-Hosted application installs inside the customer estate, with a bundled database, local AI engine and offline license validation.",
  "Employees open one workspace: capacity, maintenance, audit score, knowledge coverage and compliance signals in real time.",
  "The AI assistant answers from the company's own procedures — in English, German or Romanian, with voice, images and source context.",
  "Academy turns that knowledge into adaptive training, and the AI audit surfaces knowledge gaps before they become operational risk.",
  "Licensed product workspaces appear only when the Management Center enables them.",
  "Every install reports back with a signed heartbeat, while the Customer Portal shows license, install status and downloads.",
  "Management Center decides. The license distributes. Self-Hosted runs your operation.",
];

const Scene: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => (
  <AbsoluteFill>
    {children}
    <Subtitle>{CAPTIONS[index]}</Subtitle>
  </AbsoluteFill>
);

export const MainVideo: React.FC = () => (
  <AbsoluteFill>
    <Aurora />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[0]}>
        <Scene index={0}>
          <Title />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[1]}>
        <Scene index={1}>
          <Showcase
            kicker="Management Center"
            headline={<>Configure the customer</>}
            items={[
              "Company profile defines what is available",
              "Products enabled explicitly by OPSQAI",
              "Initial administrator and seat count",
            ]}
            shots={[
              { src: "mc-customers.png", from: 0, duration: 178 },
              { src: "mc-new-customer.png", from: 178, duration: 170 },
            ]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[2]}>
        <Scene index={2}>
          <Showcase
            align="right"
            kicker="Licensing"
            headline={<>Issue the signed license</>}
            items={[
              "Entitlements per customer install",
              "Ed25519 / JWT activation bundle",
              "Reissue when products change",
            ]}
            shots={[{ src: "mc-licenses.png", from: 0, duration: SCENE_FRAMES[2] }]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[3]}>
        <Scene index={3}>
          <Showcase
            kicker="Windows Self-Hosted"
            headline={<>Install inside the estate</>}
            items={[
              "Guided nine-step Windows installer",
              "License validated locally, offline",
              "Bundled database and local AI engine",
            ]}
            shots={[
              { src: "inst-welcome.png", from: 0, duration: 165 },
              { src: "inst-license.png", from: 165, duration: 162 },
            ]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[4]}>
        <Scene index={4}>
          <Showcase
            align="right"
            kicker="Self-Hosted · Dashboard"
            headline={<>One operational workspace</>}
            items={[
              "Capacity, maintenance and system health",
              "AI audit score and knowledge coverage",
              "Compliance signals, always on-premise",
            ]}
            shots={[{ src: "sh-dashboard.png", from: 0, duration: SCENE_FRAMES[4] }]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[5]}>
        <Scene index={5}>
          <Showcase
            kicker="Self-Hosted · AI Chat"
            headline={<>Answers from your own SOPs</>}
            items={[
              "Grounded in company knowledge",
              "EN · DE · RO, voice and images",
              "Local AI engine, no data egress",
            ]}
            shots={[{ src: "sh-chat.png", from: 0, duration: SCENE_FRAMES[5] }]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[6]}>
        <Scene index={6}>
          <Showcase
            align="right"
            kicker="Academy · AI Audit"
            headline={<>Train, audit, close the gap</>}
            items={[
              "Adaptive courses and quizzes",
              "Knowledge gaps detected automatically",
              "Remediation into KB and FAQ",
            ]}
            shots={[
              { src: "sh-academy.png", from: 0, duration: 134 },
              { src: "sh-audit.png", from: 134, duration: 133 },
            ]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[7]}>
        <Scene index={7}>
          <Showcase
            kicker="Product workspaces"
            headline={<>Only what is licensed</>}
            items={[
              "Core platform always present",
              "Product workspaces per entitlement",
              "Operations · Quality · Logistics · HR",
            ]}
            shots={[{ src: "sh-product.png", from: 0, duration: SCENE_FRAMES[7] }]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[8]}>
        <Scene index={8}>
          <Showcase
            align="right"
            kicker="Fleet & Portal"
            headline={<>Visible, without exposure</>}
            items={[
              "Signed heartbeat from each install",
              "License and install status in the Portal",
              "No customer data leaves the estate",
            ]}
            shots={[
              { src: "mc-installations.png", from: 0, duration: 166 },
              { src: "portal.png", from: 166, duration: 166 },
            ]}
          />
        </Scene>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />

      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[9]}>
        <Scene index={9}>
          <Flow />
        </Scene>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

export { Outro };
