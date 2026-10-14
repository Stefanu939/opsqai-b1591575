// Kai's face — Cyber-Companion visor with LED eyes. Shared by MC and Portal.
export type KaiFaceState = "idle" | "thinking" | "speaking";

export function KaiFace({
  size = 40,
  state = "idle",
  className = "",
}: {
  size?: number;
  state?: KaiFaceState;
  className?: string;
}) {
  const eye = state === "thinking" ? "animate-pulse" : "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Kai"
      className={className}
    >
      <defs>
        <linearGradient id="kai-shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent, var(--primary))" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#kai-shell)" />
      <rect x="10" y="20" width="44" height="24" rx="12" fill="var(--background)" opacity="0.92" />
      <g className={eye} fill="var(--primary)">
        {state === "speaking" ? (
          <>
            <rect x="19" y="29" width="9" height="4" rx="2" />
            <rect x="36" y="29" width="9" height="4" rx="2" />
          </>
        ) : (
          <>
            <ellipse cx="23.5" cy="31" rx="4" ry="5" />
            <ellipse cx="40.5" cy="31" rx="4" ry="5" />
          </>
        )}
      </g>
      <circle cx="47" cy="14" r="2.5" fill="var(--primary-foreground)" opacity="0.8" />
    </svg>
  );
}
