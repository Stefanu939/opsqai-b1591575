// Kai's face — soft, fluffy digital companion with expressive eyes.
// Shared by the public KAI page, homepage, MC and Portal.
import { useId } from "react";

export type KaiFaceState = "idle" | "thinking" | "speaking";

export function KaiFace({
  size = 40,
  state = "idle",
  float = false,
  className = "",
}: {
  size?: number;
  state?: KaiFaceState;
  float?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Kai"
      className={`kai-face kai-${state} ${float ? "kai-float" : ""} ${className}`}
    >
      <defs>
        <radialGradient id={`kb-${id}`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="var(--primary-foreground)" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent, var(--primary))" />
        </radialGradient>
        <filter id={`kg-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      {/* soft halo */}
      <ellipse className="kai-halo" cx="32" cy="34" rx="26" ry="24" fill="var(--primary)" opacity="0.35" filter={`url(#kg-${id})`} />
      {/* fluffy body: overlapping puffs */}
      <g className="kai-body" fill={`url(#kb-${id})`}>
        <circle cx="32" cy="35" r="20" />
        <circle cx="19" cy="28" r="10" />
        <circle cx="45" cy="28" r="10" />
        <circle cx="32" cy="18" r="10" />
        <circle cx="22" cy="44" r="9" />
        <circle cx="42" cy="44" r="9" />
      </g>
      {/* eyes */}
      <g className="kai-eyes" fill="var(--background)">
        <ellipse cx="25" cy="33" rx="4" ry="5.2" />
        <ellipse cx="39" cy="33" rx="4" ry="5.2" />
        <circle cx="26.4" cy="31" r="1.4" fill="var(--primary-foreground)" />
        <circle cx="40.4" cy="31" r="1.4" fill="var(--primary-foreground)" />
      </g>
      {/* mouth */}
      {state === "speaking" ? (
        <ellipse className="kai-mouth-talk" cx="32" cy="42.5" rx="3" ry="2" fill="var(--background)" />
      ) : (
        <path d="M28 41.5 Q32 44.5 36 41.5" stroke="var(--background)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      {/* cheeks */}
      <circle cx="20" cy="40" r="2.2" fill="var(--primary-foreground)" opacity="0.25" />
      <circle cx="44" cy="40" r="2.2" fill="var(--primary-foreground)" opacity="0.25" />
    </svg>
  );
}
