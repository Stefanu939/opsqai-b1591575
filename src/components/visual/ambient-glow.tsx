import { cn } from "@/lib/utils";

type Tone = "violet" | "blue" | "ember";

const TONE: Record<Tone, string> = {
  violet: "var(--glow-violet)",
  blue: "var(--glow-blue)",
  ember: "var(--glow-ember)",
};

/**
 * Aurora Noir ambient aura. A purely decorative, pointer-transparent layer —
 * use it to give a hero or status surface atmosphere, not as a default.
 */
export function AmbientGlow({
  tone = "violet",
  className,
  intensity = 1,
}: {
  tone?: Tone;
  className?: string;
  /** 0–1 multiplier; keep it low on dense operational screens. */
  intensity?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
      style={{ backgroundImage: TONE[tone], opacity: Math.max(0, Math.min(1, intensity)) }}
    />
  );
}
