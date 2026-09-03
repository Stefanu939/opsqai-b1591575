import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// Sum of scene durations (1930) minus 7 transitions x 20 frames = 1790 frames.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1790}
    fps={30}
    width={1920}
    height={1080}
  />
);
