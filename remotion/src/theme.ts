import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const body = loadBody("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;

export const C = {
  bg: "#070A14",
  bgAlt: "#0B1022",
  violet: "#7C5CFF",
  blue: "#3AA0FF",
  aqua: "#38E1C6",
  cream: "#F4F1EA",
  muted: "#9AA6C4",
  line: "rgba(148,163,205,0.18)",
};
